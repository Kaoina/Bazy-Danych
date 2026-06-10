from fastapi import APIRouter, Depends, HTTPException, Header

from app.database import get_db
from app import schemas
from app.users import get_user_name, get_user_emails
from app.settlement import compute_group_balances, calculate_debts
from app.kafka_producer import publish_expense_created
from app.routers.groups import _require_membership

router = APIRouter(prefix="/api/expenses/groups", tags=["expenses"])

SQL_SELECT_MEMBERS = """
    SELECT user_id FROM group_members WHERE group_id = %s
"""

SQL_INSERT_EXPENSE = """
    INSERT INTO expenses (group_id, paid_by, amount, description, created_at)
    VALUES (%s, %s, %s, %s, NOW() AT TIME ZONE 'utc')
    RETURNING id, group_id, paid_by, amount, description, created_at
"""

SQL_INSERT_SPLIT = """
    INSERT INTO expense_splits (expense_id, user_id, amount)
    VALUES (%s, %s, %s)
"""

SQL_SELECT_EXPENSES = """
    SELECT id, group_id, paid_by, amount, description, created_at
    FROM expenses
    WHERE group_id = %s
    ORDER BY created_at DESC
"""

SQL_SELECT_EXPENSES_FOR_BALANCE = """
    SELECT id, group_id, paid_by, amount, description, created_at
    FROM expenses
    WHERE group_id = %s
"""

SQL_SELECT_SPLITS_FOR_EXPENSES = """
    SELECT expense_id, user_id, amount
    FROM expense_splits
    WHERE expense_id = ANY(%s)
    ORDER BY expense_id, id
"""


def get_current_user(x_user_id: str = Header(...)):
    return x_user_id


@router.post("/{group_id}/expenses", response_model=schemas.ExpenseResponse, status_code=201)
async def add_expense(
    group_id: str,
    expense_data: schemas.ExpenseCreate,
    user_id: str = Depends(get_current_user),
):
    _require_membership(group_id, user_id)

    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_MEMBERS, (group_id,))
        member_rows = cur.fetchall()
        member_ids = [r["user_id"] for r in member_rows]

        share = round(expense_data.amount / len(member_ids), 2)

        cur.execute(
            SQL_INSERT_EXPENSE,
            (group_id, user_id, expense_data.amount, expense_data.description),
        )
        expense = cur.fetchone()

        for member_id in member_ids:
            cur.execute(SQL_INSERT_SPLIT, (expense["id"], member_id, share))

    paid_by_name = await get_user_name(expense["paid_by"])

    recipient_ids = [m for m in member_ids if m != user_id]
    recipient_emails = await get_user_emails(recipient_ids)

    if recipient_emails:
        publish_expense_created(
            group_id=str(group_id),
            expense_id=str(expense["id"]),
            paid_by_name=paid_by_name,
            amount=expense["amount"],
            description=expense["description"],
            created_at=expense["created_at"],
            recipient_emails=recipient_emails,
        )

    split_details = []
    for member_id in member_ids:
        name = await get_user_name(member_id)
        split_details.append(schemas.SplitDetail(user_name=name, amount=share))

    return schemas.ExpenseResponse(
        id=expense["id"],
        paid_by=paid_by_name,
        amount=expense["amount"],
        description=expense["description"],
        created_at=expense["created_at"],
        splits=split_details,
    )


@router.get("/{group_id}/expenses", response_model=list[schemas.ExpenseResponse])
async def get_expenses(
    group_id: str,
    user_id: str = Depends(get_current_user),
):
    _require_membership(group_id, user_id)

    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_EXPENSES, (group_id,))
        expense_rows = cur.fetchall()

        if not expense_rows:
            return []

        expense_ids = [e["id"] for e in expense_rows]
        cur.execute(SQL_SELECT_SPLITS_FOR_EXPENSES, (expense_ids,))
        split_rows = cur.fetchall()

    splits_by_expense: dict[int, list] = {}
    for s in split_rows:
        splits_by_expense.setdefault(s["expense_id"], []).append(s)

    all_user_ids = set()
    for e in expense_rows:
        all_user_ids.add(e["paid_by"])
        for s in splits_by_expense.get(e["id"], []):
            all_user_ids.add(s["user_id"])

    names: dict[str, str] = {}
    for uid in all_user_ids:
        names[uid] = await get_user_name(uid)

    result = []
    for expense in expense_rows:
        split_details = [
            schemas.SplitDetail(
                user_name=names.get(s["user_id"], s["user_id"]),
                amount=s["amount"],
            )
            for s in splits_by_expense.get(expense["id"], [])
        ]
        result.append(
            schemas.ExpenseResponse(
                id=expense["id"],
                paid_by=names.get(expense["paid_by"], expense["paid_by"]),
                amount=expense["amount"],
                description=expense["description"],
                created_at=expense["created_at"],
                splits=split_details,
            )
        )

    return result


@router.get("/{group_id}/balances", response_model=schemas.BalanceSummary)
async def get_balances(
    group_id: str,
    user_id: str = Depends(get_current_user),
):
    _require_membership(group_id, user_id)

    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_MEMBERS, (group_id,))
        member_ids = [r["user_id"] for r in cur.fetchall()]

        cur.execute(SQL_SELECT_EXPENSES_FOR_BALANCE, (group_id,))
        expense_rows = cur.fetchall()

        if expense_rows:
            expense_ids = [e["id"] for e in expense_rows]
            cur.execute(SQL_SELECT_SPLITS_FOR_EXPENSES, (expense_ids,))
            split_rows = cur.fetchall()
        else:
            split_rows = []

    splits_by_expense: dict[int, list] = {}
    for s in split_rows:
        splits_by_expense.setdefault(s["expense_id"], []).append(
            {"user_id": s["user_id"], "amount": s["amount"]}
        )

    expenses_for_settlement = []
    for e in expense_rows:
        expenses_for_settlement.append(
            {
                "paid_by": e["paid_by"],
                "amount": e["amount"],
                "splits": splits_by_expense.get(e["id"], []),
            }
        )

    balances = compute_group_balances(expenses_for_settlement, member_ids)
    transactions = calculate_debts(balances)

    names: dict[str, str] = {}
    for uid in member_ids:
        names[uid] = await get_user_name(uid)

    debts = [
        schemas.DebtEntry(
            from_user=names.get(debtor, debtor),
            to_user=names.get(creditor, creditor),
            amount=amount,
        )
        for debtor, creditor, amount in transactions
    ]

    return schemas.BalanceSummary(debts=debts, settled=len(debts) == 0)

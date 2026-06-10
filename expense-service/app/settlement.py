"""
Logika rozliczeń — kto komu ile winien.

Dane wejściowe to słowniki z wyników zapytań SQL (bez ORM):
  expense: {"paid_by": str, "amount": float, "splits": [{"user_id": str, "amount": float}, ...]}
"""


def calculate_debts(
    balances: dict[str, float]
) -> list[tuple[str, str, float]]:
    creditors = {u: round(b, 2) for u, b in balances.items() if b > 0.01}
    debtors = {u: round(-b, 2) for u, b in balances.items() if b < -0.01}

    transactions = []

    while creditors and debtors:
        creditor = max(creditors, key=creditors.get)
        debtor = max(debtors, key=debtors.get)

        amount = round(min(creditors[creditor], debtors[debtor]), 2)

        transactions.append((debtor, creditor, amount))

        creditors[creditor] = round(creditors[creditor] - amount, 2)
        debtors[debtor] = round(debtors[debtor] - amount, 2)

        if creditors[creditor] < 0.01:
            del creditors[creditor]
        if debtors[debtor] < 0.01:
            del debtors[debtor]

    return transactions


def compute_group_balances(
    expenses: list[dict],
    member_ids: list[str],
) -> dict[str, float]:
    balances = {uid: 0.0 for uid in member_ids}

    for expense in expenses:
        if expense["paid_by"] in balances:
            balances[expense["paid_by"]] += expense["amount"]

        for split in expense["splits"]:
            if split["user_id"] in balances:
                balances[split["user_id"]] -= split["amount"]

    return balances

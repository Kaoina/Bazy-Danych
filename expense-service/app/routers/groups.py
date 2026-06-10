from fastapi import APIRouter, Depends, HTTPException, Header

from app.database import get_db
from app import schemas
from app.group_code import generate_group_code
from app.users import get_user_name

router = APIRouter(prefix="/api/expenses/groups", tags=["groups"])

SQL_INSERT_GROUP = """
    INSERT INTO groups (id, name, description, owner_id, created_at)
    VALUES (%s, %s, %s, %s, NOW() AT TIME ZONE 'utc')
    RETURNING id, name, description, owner_id, created_at
"""

SQL_INSERT_MEMBER = """
    INSERT INTO group_members (group_id, user_id, joined_at)
    VALUES (%s, %s, NOW() AT TIME ZONE 'utc')
"""

SQL_SELECT_MY_GROUPS = """
    SELECT g.id, g.name, g.description, g.owner_id, g.created_at,
           (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
    FROM groups g
    INNER JOIN group_members m ON m.group_id = g.id
    WHERE m.user_id = %s
    ORDER BY g.created_at DESC
"""

SQL_SELECT_GROUP = """
    SELECT id, name, description, owner_id, created_at
    FROM groups
    WHERE id = %s
"""

SQL_EXISTS_MEMBER = """
    SELECT 1 FROM group_members
    WHERE group_id = %s AND user_id = %s
"""

SQL_SELECT_GROUP_MEMBERS = """
    SELECT user_id, joined_at
    FROM group_members
    WHERE group_id = %s
    ORDER BY joined_at
"""


def get_current_user(x_user_id: str = Header(...)):
    return x_user_id


@router.post("", response_model=schemas.GroupResponse, status_code=201)
async def create_group(
    group_data: schemas.GroupCreate,
    user_id: str = Depends(get_current_user),
):
    group_id = generate_group_code()

    with get_db() as (conn, cur):
        # Unikalność kodu grupy
        for _ in range(10):
            cur.execute("SELECT 1 FROM groups WHERE id = %s", (group_id,))
            if not cur.fetchone():
                break
            group_id = generate_group_code()
        else:
            raise HTTPException(status_code=500, detail="Nie udało się wygenerować kodu grupy")

        cur.execute(
            SQL_INSERT_GROUP,
            (group_id, group_data.name, group_data.description, user_id),
        )
        row = cur.fetchone()
        cur.execute(SQL_INSERT_MEMBER, (group_id, user_id))

    owner_name = await get_user_name(row["owner_id"])
    return schemas.GroupResponse(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        owner_name=owner_name,
        created_at=row["created_at"],
    )


@router.get("", response_model=list[schemas.GroupWithMembers])
async def get_my_groups(user_id: str = Depends(get_current_user)):
    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_MY_GROUPS, (user_id,))
        rows = cur.fetchall()

    result = []
    for row in rows:
        owner_name = await get_user_name(row["owner_id"])
        result.append(
            schemas.GroupWithMembers(
                id=row["id"],
                name=row["name"],
                description=row["description"],
                owner_name=owner_name,
                created_at=row["created_at"],
                member_count=row["member_count"],
            )
        )
    return result


@router.get("/{group_id}/members", response_model=list[schemas.MemberInfo])
async def get_group_members(
    group_id: str,
    user_id: str = Depends(get_current_user),
):
    _require_membership(group_id, user_id)

    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_GROUP_MEMBERS, (group_id,))
        rows = cur.fetchall()

    members = []
    for row in rows:
        name = await get_user_name(row["user_id"])
        members.append(
            schemas.MemberInfo(
                name=name,
                is_current_user=row["user_id"] == user_id,
            )
        )
    return members


@router.post("/{group_id}/join", response_model=schemas.MessageResponse)
def join_group(
    group_id: str,
    user_id: str = Depends(get_current_user),
):
    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_GROUP, (group_id,))
        group = cur.fetchone()
        if not group:
            raise HTTPException(status_code=404, detail="Grupa nie istnieje")

        cur.execute(SQL_EXISTS_MEMBER, (group_id, user_id))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Już jesteś członkiem tej grupy")

        cur.execute(SQL_INSERT_MEMBER, (group_id, user_id))

    return {"message": f"Dołączyłeś do grupy '{group['name']}'"}


def _require_membership(group_id: str, user_id: str):
    with get_db() as (conn, cur):
        cur.execute(SQL_SELECT_GROUP, (group_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Grupa nie istnieje")
        cur.execute(SQL_EXISTS_MEMBER, (group_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Nie jesteś członkiem tej grupy")

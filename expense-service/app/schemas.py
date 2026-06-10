from datetime import datetime
from pydantic import BaseModel, field_validator


# --- GRUPY ---

class GroupCreate(BaseModel):
    name: str
    description: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Nazwa grupy nie może być pusta")
        return v


class GroupResponse(BaseModel):
    id: str
    name: str
    description: str | None
    owner_name: str
    created_at: datetime


class GroupWithMembers(GroupResponse):
    member_count: int


class MemberInfo(BaseModel):
    """Członek grupy — dane zrozumiałe dla operatora (bez UUID)."""
    name: str
    is_current_user: bool = False


# --- WYDATKI ---

class ExpenseCreate(BaseModel):
    amount: float
    description: str

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Kwota musi być większa od zera")
        return v

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Opis wydatku nie może być pusty")
        return v


class SplitDetail(BaseModel):
    user_name: str
    amount: float


class ExpenseResponse(BaseModel):
    id: int
    paid_by: str
    amount: float
    description: str
    created_at: datetime
    splits: list[SplitDetail] = []


# --- ROZLICZENIA ---

class DebtEntry(BaseModel):
    from_user: str
    to_user: str
    amount: float


class BalanceSummary(BaseModel):
    debts: list[DebtEntry]
    settled: bool


# --- OGÓLNE ---

class MessageResponse(BaseModel):
    message: str

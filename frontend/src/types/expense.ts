export interface Group {
    id: string;
    name: string;
    description: string | null;
    owner_name: string;
    created_at: string;
    member_count: number;
}

export interface MemberInfo {
    name: string;
    is_current_user: boolean;
}

export interface SplitDetail {
    user_name: string;
    amount: number;
}

export interface Expense {
    id: number;
    paid_by: string;
    amount: number;
    description: string;
    created_at: string;
    splits: SplitDetail[];
}

export interface DebtEntry {
    from_user: string;
    to_user: string;
    amount: number;
}

export interface BalanceSummary {
    debts: DebtEntry[];
    settled: boolean;
}

export interface CreateGroupRequest {
    name: string;
    description?: string;
}

export interface CreateExpenseRequest {
    amount: number;
    description: string;
}

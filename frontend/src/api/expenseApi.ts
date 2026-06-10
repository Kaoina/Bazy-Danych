import { AxiosError } from 'axios';
import { apiClient } from './client';
import type { Group, MemberInfo, Expense, BalanceSummary, CreateGroupRequest, CreateExpenseRequest } from '../types/expense';
import type { ApiResult } from '../types/auth';

function extractMessage(error: unknown): { message: string; status?: number } {
    if (error instanceof AxiosError) {
        const data = error.response?.data as { detail?: string } | undefined;
        return { message: data?.detail ?? 'Nieoczekiwany błąd serwera.', status: error.response?.status };
    }
    return { message: 'Nie można połączyć się z serwerem.' };
}

export async function getMyGroups(): Promise<ApiResult<Group[]>> {
    try {
        const { data } = await apiClient.get<Group[]>('/api/expenses/groups');
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

export async function createGroup(payload: CreateGroupRequest): Promise<ApiResult<Group>> {
    try {
        const { data } = await apiClient.post<Group>('/api/expenses/groups', payload);
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

export async function joinGroup(groupId: string): Promise<ApiResult<{ message: string }>> {
    try {
        const { data } = await apiClient.post(`/api/expenses/groups/${groupId}/join`);
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

export async function getExpenses(groupId: string): Promise<ApiResult<Expense[]>> {
    try {
        const { data } = await apiClient.get<Expense[]>(`/api/expenses/groups/${groupId}/expenses`);
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

export async function addExpense(groupId: string, payload: CreateExpenseRequest): Promise<ApiResult<Expense>> {
    try {
        const { data } = await apiClient.post<Expense>(`/api/expenses/groups/${groupId}/expenses`, payload);
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

export async function getBalances(groupId: string): Promise<ApiResult<BalanceSummary>> {
    try {
        const { data } = await apiClient.get<BalanceSummary>(`/api/expenses/groups/${groupId}/balances`);
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

export async function getGroupMembers(groupId: string): Promise<ApiResult<MemberInfo[]>> {
    try {
        const { data } = await apiClient.get<MemberInfo[]>(`/api/expenses/groups/${groupId}/members`);
        return { ok: true, data };
    } catch (err) { return { ok: false, ...extractMessage(err) }; }
}

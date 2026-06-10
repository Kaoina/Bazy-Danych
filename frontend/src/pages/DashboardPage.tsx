import { useState, useEffect } from 'react';
import { getMyGroups, createGroup, joinGroup, getExpenses, addExpense, getBalances, getGroupMembers } from '../api/expenseApi';
import type { Group, Expense, BalanceSummary, MemberInfo } from '../types/expense';

type Tab = 'expenses' | 'balances';

export function DashboardPage() {

    const [groups, setGroups] = useState<Group[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupsError, setGroupsError] = useState<string | null>(null);

    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('expenses');

    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expensesLoading, setExpensesLoading] = useState(false);

    const [balances, setBalances] = useState<BalanceSummary | null>(null);
    const [balancesLoading, setBalancesLoading] = useState(false);

    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [joinId, setJoinId] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');

    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [codeCopied, setCodeCopied] = useState(false);

    useEffect(() => { loadGroups(); }, []);

    useEffect(() => {
        if (!selectedGroup) {
            setExpenses([]);
            setBalances(null);
            setMembers([]);
            return;
        }
        loadMembers(selectedGroup.id);
        if (activeTab === 'expenses') loadExpenses(selectedGroup.id);
        if (activeTab === 'balances') loadBalances(selectedGroup.id);
    }, [selectedGroup, activeTab]);

    async function loadGroups() {
        setGroupsLoading(true);
        const result = await getMyGroups();
        if (result.ok) setGroups(result.data);
        else setGroupsError(result.message);
        setGroupsLoading(false);
    }

    async function loadMembers(groupId: string) {
        setMembersLoading(true);
        const result = await getGroupMembers(groupId);
        if (result.ok) setMembers(result.data);
        setMembersLoading(false);
    }

    async function loadExpenses(groupId: string) {
        setExpensesLoading(true);
        const result = await getExpenses(groupId);
        if (result.ok) setExpenses(result.data);
        setExpensesLoading(false);
    }

    async function loadBalances(groupId: string) {
        setBalancesLoading(true);
        const result = await getBalances(groupId);
        if (result.ok) setBalances(result.data);
        setBalancesLoading(false);
    }

    function handleGroupClick(group: Group) {
        if (selectedGroup?.id === group.id) { setSelectedGroup(null); return; }
        setSelectedGroup(group);
        setActiveTab('expenses');
        setFormError(null);
        setFormSuccess(null);
        setCodeCopied(false);
    }

    async function handleCreateGroup(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null); setFormSuccess(null);
        const result = await createGroup({ name: newGroupName, description: newGroupDesc || undefined });
        if (result.ok) {
            setFormSuccess(`Grupa „${result.data.name}” utworzona. Kod do udostępnienia: ${result.data.id}`);
            setNewGroupName(''); setNewGroupDesc('');
            loadGroups();
        } else { setFormError(result.message); }
    }

    async function handleJoinGroup(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null); setFormSuccess(null);
        const code = joinId.trim().toUpperCase();
        if (code.length !== 5) { setFormError('Kod grupy musi mieć dokładnie 5 znaków'); return; }
        const result = await joinGroup(code);
        if (result.ok) { setFormSuccess(result.data.message); setJoinId(''); loadGroups(); }
        else { setFormError(result.message); }
    }

    async function handleAddExpense(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedGroup) return;
        setFormError(null); setFormSuccess(null);
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount)) { setFormError('Kwota musi być liczbą'); return; }
        const result = await addExpense(selectedGroup.id, { amount, description: expenseDesc });
        if (result.ok) {
            setFormSuccess('Wydatek dodany — kwota podzielona po równo między wszystkich członków.');
            setExpenseAmount(''); setExpenseDesc('');
            loadExpenses(selectedGroup.id);
            setBalances(null);
        } else { setFormError(result.message); }
    }

    async function copyGroupCode(code: string) {
        try {
            await navigator.clipboard.writeText(code);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch {
            setFormError('Nie udało się skopiować kodu — zaznacz go ręcznie.');
        }
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>

            <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

                {formError   && <div style={msgBox('error')}>{formError}</div>}
                {formSuccess && <div style={msgBox('success')}>{formSuccess}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={cardStyle}>
                        <h2 style={sectionTitle}>Nowa grupa</h2>
                        <form onSubmit={handleCreateGroup}>
                            <input placeholder="Nazwa grupy *" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required style={inputStyle} />
                            <input placeholder="Opis (opcjonalnie)" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} style={inputStyle} />
                            <button type="submit" style={accentBtn}>Stwórz grupę</button>
                        </form>
                    </div>
                    <div style={cardStyle}>
                        <h2 style={sectionTitle}>Dołącz do grupy</h2>
                        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: '0.75rem', marginTop: -4 }}>
                            Wpisz 5-znakowy kod od znajomego, np. <strong style={{ color: 'var(--color-accent)' }}>X3K9M</strong>
                        </p>
                        <form onSubmit={handleJoinGroup}>
                            <input placeholder="KOD GRUPY" value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())} maxLength={5} required style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 700, fontSize: 18, textAlign: 'center' }} />
                            <button type="submit" style={accentBtn}>Dołącz</button>
                        </form>
                    </div>
                </div>

                <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                    <h2 style={sectionTitle}>Moje grupy</h2>
                    {groupsLoading && <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Ładowanie...</p>}
                    {groupsError   && <p style={{ color: 'var(--color-error)', fontSize: 14 }}>{groupsError}</p>}
                    {!groupsLoading && groups.length === 0 && <p style={{ color: 'var(--color-faint)', fontSize: 14 }}>Nie należysz jeszcze do żadnej grupy.</p>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {groups.map(group => {
                            const isSelected = selectedGroup?.id === group.id;
                            return (
                                <button key={group.id} onClick={() => handleGroupClick(group)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: isSelected ? '1px solid var(--color-accent-border)' : '1px solid var(--color-border)', background: isSelected ? 'var(--color-accent-dim)' : 'var(--color-subtle)', color: isSelected ? 'var(--color-accent)' : 'var(--color-text)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, fontSize: 14, fontWeight: isSelected ? 600 : 400, fontFamily: 'var(--font-body)', textAlign: 'left' }}>
                                    <strong>{group.name}</strong>
                                    <span style={{ opacity: 0.75, fontSize: 12 }}>
                                        {group.member_count} {group.member_count === 1 ? 'osoba' : group.member_count < 5 ? 'osoby' : 'osób'}
                                        {' · '}właściciel: {group.owner_name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedGroup && (
                    <div style={{ ...cardStyle, animation: 'fade-in 0.2s ease' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ ...sectionTitle, marginBottom: 4 }}>📂 {selectedGroup.name}</h2>
                                {selectedGroup.description && <p style={{ color: 'var(--color-muted)', fontSize: 14, marginBottom: 4 }}>{selectedGroup.description}</p>}
                                <p style={{ color: 'var(--color-faint)', fontSize: 13, marginBottom: 8 }}>
                                    Właściciel: <strong style={{ color: 'var(--color-text)' }}>{selectedGroup.owner_name}</strong>
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>Kod grupy:</span>
                                    <strong style={{ color: 'var(--color-accent)', letterSpacing: '0.15em', fontSize: 16 }}>{selectedGroup.id}</strong>
                                    <button type="button" onClick={() => copyGroupCode(selectedGroup.id)} style={{ ...accentBtn, padding: '0.35rem 0.75rem', fontSize: 12 }}>
                                        {codeCopied ? 'Skopiowano!' : 'Kopiuj kod'}
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} style={{ background: 'var(--color-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-muted)', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>

                        <div style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                            <h3 style={{ color: 'var(--color-text)', fontSize: 14, fontWeight: 600, marginBottom: '0.5rem' }}>Członkowie grupy</h3>
                            {membersLoading && <p style={{ color: 'var(--color-muted)', fontSize: 13 }}>Ładowanie...</p>}
                            {!membersLoading && members.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {members.map((m, i) => (
                                        <span key={i} style={{ fontSize: 13, padding: '0.25rem 0.65rem', background: m.is_current_user ? 'var(--color-accent-dim)' : 'var(--color-subtle)', border: `1px solid ${m.is_current_user ? 'var(--color-accent-border)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-full)', color: m.is_current_user ? 'var(--color-accent)' : 'var(--color-text)' }}>
                                            {m.name}{m.is_current_user ? ' (Ty)' : ''}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
                            {(['expenses', 'balances'] as Tab[]).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent', color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-muted)', cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab ? 600 : 400, fontFamily: 'var(--font-body)', marginBottom: -1 }}>
                                    {tab === 'expenses' ? '🧾 Wydatki' : '⚖️ Rozliczenia'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'expenses' && (
                            <>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h3 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Dodaj wydatek</h3>
                                    <p style={{ color: 'var(--color-faint)', fontSize: 13, marginBottom: '0.75rem' }}>
                                        Zapłacisz Ty — kwota zostanie podzielona po równo między wszystkich {selectedGroup.member_count} członków ({members.map(m => m.name).join(', ') || '…'}).
                                    </p>
                                    <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <input placeholder="Kwota (zł)" type="number" step="0.01" min="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required style={{ ...inputStyle, width: 130, marginBottom: 0 }} />
                                        <input placeholder="Opis (np. pizza)" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
                                        <button type="submit" style={accentBtn}>Dodaj</button>
                                    </form>
                                </div>

                                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                                    <h3 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 600, marginBottom: '0.75rem' }}>Historia wydatków</h3>
                                    {expensesLoading && <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Ładowanie...</p>}
                                    {!expensesLoading && expenses.length === 0 && <p style={{ color: 'var(--color-faint)', fontSize: 14 }}>Brak wydatków w tej grupie.</p>}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {expenses.map(expense => (
                                            <div key={expense.id} style={{ background: 'var(--color-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: expense.splits.length > 0 ? '0.5rem' : 0 }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{expense.description}</span>
                                                        <span style={{ color: 'var(--color-muted)', fontSize: 13, marginLeft: 8 }}>— zapłacił/a <strong>{expense.paid_by}</strong></span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: 16 }}>{expense.amount.toFixed(2)} zł</span>
                                                        <div style={{ color: 'var(--color-faint)', fontSize: 12, marginTop: 2 }}>{formatDate(expense.created_at)}</div>
                                                    </div>
                                                </div>
                                                {expense.splits.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                                                        <span style={{ color: 'var(--color-faint)', fontSize: 12, alignSelf: 'center' }}>Udział każdej osoby:</span>
                                                        {expense.splits.map((split, i) => (
                                                            <span key={i} style={{ fontSize: 12, padding: '0.2rem 0.6rem', background: 'var(--color-accent-dim)', border: '1px solid var(--color-accent-border)', borderRadius: 'var(--radius-full)', color: 'var(--color-accent)' }}>
                                                                {split.user_name}: {split.amount.toFixed(2)} zł
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'balances' && (
                            <div>
                                {balancesLoading && <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>Obliczanie rozliczeń...</p>}

                                {balances && balances.settled && (
                                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                                        <div style={{ fontSize: 48, marginBottom: '0.75rem' }}>🎉</div>
                                        <p style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: 16 }}>Wszyscy są kwita!</p>
                                        <p style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 4 }}>Brak żadnych długów w tej grupie.</p>
                                    </div>
                                )}

                                {balances && !balances.settled && (
                                    <div>
                                        <p style={{ color: 'var(--color-muted)', fontSize: 13, marginBottom: '1rem' }}>
                                            Minimalna liczba przelewów, żeby wszyscy byli kwita:
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {balances.debts.map((debt, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{debt.from_user}</span>
                                                        <span style={{ color: 'var(--color-muted)', fontSize: 13 }}> jest winna/winny</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ color: 'var(--color-error)', fontWeight: 700, fontSize: 16 }}>{debt.amount.toFixed(2)} zł</span>
                                                        <span style={{ color: 'var(--color-faint)' }}>→</span>
                                                    </div>
                                                    <div style={{ flex: 1, textAlign: 'right' }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{debt.to_user}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

function msgBox(kind: 'error' | 'success'): React.CSSProperties {
    if (kind === 'error') {
        return { padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: 13 };
    }
    return { padding: '0.75rem 1rem', marginBottom: '1.5rem', background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.22)', borderRadius: 'var(--radius-md)', color: 'var(--color-accent)', fontSize: 13 };
}

const cardStyle: React.CSSProperties = { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' };
const sectionTitle: React.CSSProperties = { margin: '0 0 1rem 0', fontSize: 16, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-display)' };
const inputStyle: React.CSSProperties = { display: 'block', width: '100%', padding: '0.625rem 1rem', marginBottom: '0.75rem', background: 'var(--color-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };
const accentBtn: React.CSSProperties = { padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#0a0f1a', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' };

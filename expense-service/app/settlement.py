"""
Logika rozliczeń — kto komu ile winien.

Algorytm działa w dwóch krokach:

1. BILANS: dla każdej osoby liczymy jej "saldo":
   saldo = suma tego co zapłaciła - suma tego co jest winna
   Saldo dodatnie → ktoś jej jest winny pieniądze
   Saldo ujemne  → ona jest winna pieniądze innym

2. MINIMALIZACJA: łączymy długi żeby było jak najmniej przelewów.
   Np. zamiast Anna→Kasia 20zł i Kasia→Anna 10zł
   wystarczy Anna→Kasia 10zł (jeden przelew zamiast dwóch)

Przykład:
   Wydatki: Ania płaci 90zł (wszyscy winni po 30), Kasia płaci 30zł (wszyscy winni po 10)
   Bilanse: Ania: +90 -30 -10 = +50, Kasia: +30 -30 -10 = -10, Marek: 0 -30 -10 = -40
   Długi: Marek→Ania 40zł, Kasia→Ania 10zł
"""


def calculate_debts(
    balances: dict[str, float]   # {user_id: saldo}
) -> list[tuple[str, str, float]]:
    """
    Zamienia słownik sald na listę transakcji (kto, komu, ile).
    Minimalizuje liczbę przelewów.
    Zwraca listę krotek: (dłużnik, wierzyciel, kwota)

    Przykład:
        balances = {'A': 50.0, 'B': -10.0, 'C': -40.0}
        => [('C', 'A', 40.0), ('B', 'A', 10.0)]
    """
    # Rozdzielamy użytkowników na wierzycieli i dłużników.
    # Wierzyciele mają dodatnie saldo — ktoś im jest winny.
    # Dłużnicy mają ujemne saldo — oni muszą zapłacić innym.
    # Przekształcamy ujemne salda na pozytywne liczby, aby łatwiej było je porównywać.
    # Zaokrąglamy do 2 miejsc, żeby uniknąć problemów z floating point (np. 0.10000000001).
    creditors = {u: round(b, 2) for u, b in balances.items() if b > 0.01}
    debtors   = {u: round(-b, 2) for u, b in balances.items() if b < -0.01}

    transactions = []

    # Greedy algorithm — łączymy największe salda najpierw, aby zmniejszyć liczbę przelewów.
    # W każdej iteracji rozliczamy jedną transakcję między najwyższym dłużnikiem i najwyższym wierzycielem.
    while creditors and debtors:
        # Wybieramy osobę, która powinna otrzymać najwięcej (wierzyciel)
        # oraz osobę, która musi zapłacić najwięcej (dłużnik).
        creditor = max(creditors, key=creditors.get)
        debtor   = max(debtors,   key=debtors.get)

        # Kwota to minimum między tym, co wierzyciel ma dostać, a tym, co dłużnik musi spłacić.
        amount = min(creditors[creditor], debtors[debtor])
        amount = round(amount, 2)

        # Dodajemy pojedynczą transakcję: dłużnik płaci wierzycielowi.
        transactions.append((debtor, creditor, amount))

        # Aktualizujemy salda po rozliczeniu tej transakcji.
        creditors[creditor] = round(creditors[creditor] - amount, 2)
        debtors[debtor]     = round(debtors[debtor] - amount, 2)

        # Usuń osoby, które już się całkowicie rozliczyły.
        # Małe wartości poniżej progu 0.01 traktujemy jako zero, bo floaty mogą być nieprecyzyjne.
        if creditors[creditor] < 0.01:
            del creditors[creditor]
        if debtors[debtor] < 0.01:
            del debtors[debtor]

    return transactions


def compute_group_balances(
    expenses: list,          # lista obiektów Expense z relacją splits
    member_ids: list[str]    # wszyscy członkowie grupy
) -> dict[str, float]:
    """
    Oblicza saldo każdego członka grupy.
    Saldo = ile zapłacił - ile jest winny za cudze wydatki
    """
    # Zacznij od zera dla każdego członka
    balances = {uid: 0.0 for uid in member_ids}

    for expense in expenses:
        # Osoba która zapłaciła dostaje "+kwota" na saldo
        if expense.paid_by in balances:
            balances[expense.paid_by] += expense.amount

        # Każda osoba z podziału dostaje "-jej_część" na saldo
        for split in expense.splits:
            if split.user_id in balances:
                balances[split.user_id] -= split.amount

    return balances

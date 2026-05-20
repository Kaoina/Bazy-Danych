import unittest
from collections import namedtuple
from .settlement import compute_group_balances, calculate_debts

# Do symulacji obiektów z bazy danych użyto `namedtuple`.
# Dzięki temu kod testów jest czytelny i nie wymaga prawdziwej bazy.
Expense = namedtuple("Expense", ["paid_by", "amount", "splits"])
Split = namedtuple("Split", ["user_id", "amount"])

class TestSettlement(unittest.TestCase):

    def test_compute_group_balances_simple(self):
        """
        Testuje obliczanie sald w prostym przypadku:
        - Ania płaci 100 zł za siebie i za Bartka (po 50 zł).
        - Oczekiwany wynik: Ania +50 zł, Bartek -50 zł.
        """
        # Dane wejściowe: jeden wydatek, dwóch członków grupy
        members = ["ania_id", "bartek_id"]
        expenses = [
            Expense(
                paid_by="ania_id",
                amount=100.0,
                splits=[
                    Split(user_id="ania_id", amount=50.0),
                    Split(user_id="bartek_id", amount=50.0),
                ],
            )
        ]

        # Wywołanie testowanej funkcji
        balances = compute_group_balances(expenses, members)

        # Sprawdzenie wyników
        self.assertEqual(balances["ania_id"], 50.0)
        self.assertEqual(balances["bartek_id"], -50.0)

    def test_compute_group_balances_multiple_expenses(self):
        """
        Testuje obliczanie sald przy wielu wydatkach:
        - Ania płaci 90 zł (po 30 zł na 3 osoby).
        - Kasia płaci 30 zł (po 10 zł na 3 osoby).
        - Oczekiwane salda: Ania +50, Kasia -10, Marek -40.
        """
        members = ["ania_id", "kasia_id", "marek_id"]
        expenses = [
            Expense(
                paid_by="ania_id",
                amount=90.0,
                splits=[
                    Split(user_id="ania_id", amount=30.0),
                    Split(user_id="kasia_id", amount=30.0),
                    Split(user_id="marek_id", amount=30.0),
                ],
            ),
            Expense(
                paid_by="kasia_id",
                amount=30.0,
                splits=[
                    Split(user_id="ania_id", amount=10.0),
                    Split(user_id="kasia_id", amount=10.0),
                    Split(user_id="marek_id", amount=10.0),
                ],
            ),
        ]

        balances = compute_group_balances(expenses, members)

        self.assertAlmostEqual(balances["ania_id"], 50.0)
        self.assertAlmostEqual(balances["kasia_id"], -10.0)
        self.assertAlmostEqual(balances["marek_id"], -40.0)

    def test_calculate_debts_simple(self):
        """
        Testuje minimalizację długów w prostym przypadku:
        - Ania jest winna 50 zł, Bartek ma dostać 50 zł.
        - Oczekiwany wynik: jedna transakcja (Ania -> Bartek, 50 zł).
        """
        balances = {"ania_id": -50.0, "bartek_id": 50.0}
        
        debts = calculate_debts(balances)

        # Sprawdzamy, czy jest dokładnie jedna transakcja
        self.assertEqual(len(debts), 1)
        # Sprawdzamy, czy transakcja jest poprawna (dłużnik, wierzyciel, kwota)
        self.assertEqual(debts[0], ("ania_id", "bartek_id", 50.0))

    def test_calculate_debts_complex(self):
        """
        Testuje minimalizację długów w bardziej złożonym przypadku:
        - Ania ma dostać 50 zł.
        - Kasia jest winna 10 zł.
        - Marek jest winny 40 zł.
        - Oczekiwany wynik: dwie transakcje (Marek -> Ania 40 zł, Kasia -> Ania 10 zł).
        """
        balances = {"ania_id": 50.0, "kasia_id": -10.0, "marek_id": -40.0}
        
        debts = calculate_debts(balances)
        
        # Wynik może przyjść w różnej kolejności, więc sortujemy lub używamy set
        expected_debts = {
            ("marek_id", "ania_id", 40.0),
            ("kasia_id", "ania_id", 10.0),
        }

        self.assertEqual(len(debts), 2)
        self.assertEqual(set(debts), expected_debts)

    def test_calculate_debts_circular_dependency(self):
        """
        Testuje przypadek "łańcucha" długów:
        - A -> B: 10 zł
        - B -> C: 10 zł
        - C -> A: 10 zł
        - Po uproszczeniu nikt nikomu nie jest nic winien.
        """
        balances = {"A": 0, "B": 0, "C": 0} # Salda są zerowe
        debts = calculate_debts(balances)
        self.assertEqual(len(debts), 0)

if __name__ == '__main__':
    unittest.main()

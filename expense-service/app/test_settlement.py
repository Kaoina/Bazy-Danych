import unittest
from .settlement import compute_group_balances, calculate_debts


class TestSettlement(unittest.TestCase):

    def test_compute_group_balances_simple(self):
        members = ["ania_id", "bartek_id"]
        expenses = [
            {
                "paid_by": "ania_id",
                "amount": 100.0,
                "splits": [
                    {"user_id": "ania_id", "amount": 50.0},
                    {"user_id": "bartek_id", "amount": 50.0},
                ],
            }
        ]

        balances = compute_group_balances(expenses, members)

        self.assertEqual(balances["ania_id"], 50.0)
        self.assertEqual(balances["bartek_id"], -50.0)

    def test_compute_group_balances_multiple_expenses(self):
        members = ["ania_id", "kasia_id", "marek_id"]
        expenses = [
            {
                "paid_by": "ania_id",
                "amount": 90.0,
                "splits": [
                    {"user_id": "ania_id", "amount": 30.0},
                    {"user_id": "kasia_id", "amount": 30.0},
                    {"user_id": "marek_id", "amount": 30.0},
                ],
            },
            {
                "paid_by": "kasia_id",
                "amount": 30.0,
                "splits": [
                    {"user_id": "ania_id", "amount": 10.0},
                    {"user_id": "kasia_id", "amount": 10.0},
                    {"user_id": "marek_id", "amount": 10.0},
                ],
            },
        ]

        balances = compute_group_balances(expenses, members)

        self.assertAlmostEqual(balances["ania_id"], 50.0)
        self.assertAlmostEqual(balances["kasia_id"], -10.0)
        self.assertAlmostEqual(balances["marek_id"], -40.0)

    def test_calculate_debts_simple(self):
        balances = {"ania_id": -50.0, "bartek_id": 50.0}
        debts = calculate_debts(balances)
        self.assertEqual(len(debts), 1)
        self.assertEqual(debts[0], ("ania_id", "bartek_id", 50.0))

    def test_calculate_debts_complex(self):
        balances = {"ania_id": 50.0, "kasia_id": -10.0, "marek_id": -40.0}
        debts = calculate_debts(balances)
        expected_debts = {
            ("marek_id", "ania_id", 40.0),
            ("kasia_id", "ania_id", 10.0),
        }
        self.assertEqual(len(debts), 2)
        self.assertEqual(set(debts), expected_debts)

    def test_calculate_debts_circular_dependency(self):
        balances = {"A": 0, "B": 0, "C": 0}
        debts = calculate_debts(balances)
        self.assertEqual(len(debts), 0)


if __name__ == "__main__":
    unittest.main()

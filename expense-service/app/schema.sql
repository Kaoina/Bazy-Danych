-- Schemat bazy expense_db (PostgreSQL)
-- Tabele zgodne z modelem relacyjnym aplikacji rozliczeń grupowych

CREATE TABLE IF NOT EXISTS groups (
    id          VARCHAR(5) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id    VARCHAR(36) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS group_members (
    id         SERIAL PRIMARY KEY,
    group_id   VARCHAR(5) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    VARCHAR(36) NOT NULL,
    joined_at  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS expenses (
    id          SERIAL PRIMARY KEY,
    group_id    VARCHAR(5) NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by     VARCHAR(36) NOT NULL,
    amount      DOUBLE PRECISION NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id         SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id    VARCHAR(36) NOT NULL,
    amount     DOUBLE PRECISION NOT NULL CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);

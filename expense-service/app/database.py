from contextlib import contextmanager
from pathlib import Path

import psycopg2
import psycopg2.extras
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:password@expense-db:5432/expense_db"


settings = Settings()


def _parse_database_url(url: str) -> dict:
    """Parsuje URL postgresql://user:pass@host:port/dbname na parametry psycopg2."""
    # postgresql://postgres:password@expense-db:5432/expense_db
    without_scheme = url.split("://", 1)[1]
    auth, rest = without_scheme.split("@", 1)
    user, password = auth.split(":", 1)
    host_port, dbname = rest.split("/", 1)
    if ":" in host_port:
        host, port = host_port.split(":", 1)
    else:
        host, port = host_port, "5432"
    return {
        "dbname": dbname,
        "user": user,
        "password": password,
        "host": host,
        "port": int(port),
    }


_conn_params = _parse_database_url(settings.database_url)


def get_connection():
    """Nowe połączenie z bazą — każde zapytanie HTTP używa własnej sesji."""
    return psycopg2.connect(**_conn_params)


@contextmanager
def get_db():
    """Kontekst menedżer: połączenie + kursor słownikowy, commit/rollback na końcu."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield conn, cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema():
    """Wykonuje schema.sql przy starcie serwisu."""
    schema_path = Path(__file__).parent / "schema.sql"
    sql = schema_path.read_text(encoding="utf-8")
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        conn.close()

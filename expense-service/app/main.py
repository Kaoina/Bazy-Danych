from fastapi import FastAPI
from app.database import init_schema
from app.routers import groups, expenses

app = FastAPI(title="Expense Service")

# Inicjalizacja schematu z pliku SQL (bez ORM / auto-DDL)
init_schema()

app.include_router(groups.router)
app.include_router(expenses.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}

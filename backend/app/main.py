from fastapi import FastAPI
from .database import engine, Base
from . import api
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
if "invoices" in inspector.get_table_names():
    existing = {c["name"] for c in inspector.get_columns("invoices")}
    has_old_cols = "description" in existing and "amount" in existing

    with engine.connect() as conn:
        for col, dtype in [
            ("invoice_number", "VARCHAR"),
            ("subtotal", "FLOAT DEFAULT 0"),
            ("tax_rate", "FLOAT DEFAULT 0"),
            ("tax_amount", "FLOAT DEFAULT 0"),
            ("total", "FLOAT DEFAULT 0"),
            ("notes", "TEXT"),
            ("due_date", "DATE"),
            ("estimate_id", "INTEGER"),
            ("created_at", "TIMESTAMP"),
            ("updated_at", "TIMESTAMP"),
        ]:
            if col not in existing:
                conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col} {dtype}"))

        if has_old_cols:
            result = conn.execute(text("SELECT id FROM invoices WHERE invoice_number IS NULL"))
            for row in result:
                conn.execute(
                    text("UPDATE invoices SET invoice_number = :num WHERE id = :id"),
                    {"num": f"INV-{row[0]:06d}", "id": row[0]},
                )
            conn.execute(
                text("UPDATE invoices SET notes = description WHERE notes IS NULL AND description IS NOT NULL")
            )
            conn.execute(
                text("UPDATE invoices SET total = amount, subtotal = amount WHERE total = 0 AND amount IS NOT NULL")
            )

        conn.commit()

app = FastAPI(title="Garage ERP Admin Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)

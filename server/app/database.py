from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import SERVER_ROOT, settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sqlite_has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return any(row[1] == column for row in rows)


def _apply_sqlite_migrations() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    patches = [
        (
            "ingredients",
            "quantity_kind",
            "ALTER TABLE ingredients ADD COLUMN quantity_kind VARCHAR(16) DEFAULT 'count'",
        ),
        (
            "shopping_list_items",
            "quantity_kind",
            "ALTER TABLE shopping_list_items ADD COLUMN quantity_kind VARCHAR(16) DEFAULT 'count'",
        ),
        (
            "products",
            "default_quantity_kind",
            "ALTER TABLE products ADD COLUMN default_quantity_kind VARCHAR(16)",
        ),
    ]
    with engine.begin() as conn:
        for table, column, ddl in patches:
            if not _sqlite_has_column(conn, table, column):
                conn.execute(text(ddl))


def init_db() -> None:
    from app import models  # noqa: F401

    (SERVER_ROOT / "data").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _apply_sqlite_migrations()

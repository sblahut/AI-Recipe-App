from datetime import datetime, timezone

from app.models import RecipeChatMessage
from app.services.recipe_chat import chat_session_preview


class _FakeQuery:
    def __init__(self, rows: list) -> None:
        self._rows = rows

    def filter(self, *args, **kwargs) -> "_FakeQuery":
        return self

    def order_by(self, *args) -> "_FakeQuery":
        return self

    def first(self):
        return self._rows[0] if self._rows else None

    def count(self) -> int:
        return len(self._rows)


class _FakeDb:
    def __init__(self, mapping: dict) -> None:
        self._mapping = mapping

    def query(self, model):
        return _FakeQuery(self._mapping.get(model, []))


def test_chat_session_preview_uses_first_user_message() -> None:
    session_id = 7
    messages = [
        RecipeChatMessage(
            id=1,
            session_id=session_id,
            role="user",
            content="Quick pasta with pantry staples",
            recipes_json=None,
            created_at=datetime.now(timezone.utc),
        ),
        RecipeChatMessage(
            id=2,
            session_id=session_id,
            role="assistant",
            content="Here is an idea",
            recipes_json=None,
            created_at=datetime.now(timezone.utc),
        ),
    ]
    db = _FakeDb({RecipeChatMessage: messages})
    assert chat_session_preview(db, session_id) == "Quick pasta with pantry staples"

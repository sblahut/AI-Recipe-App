from app.services.display_text import normalize_display_text
from app.services.recipe_chat import parse_assistant_reply


def test_normalize_display_text_unescapes_newlines() -> None:
    assert normalize_display_text("Line one\\nLine two") == "Line one\nLine two"


def test_normalize_display_text_strips_bold_markdown() -> None:
    assert normalize_display_text("**Tomato soup** with *basil*") == "Tomato soup with basil"


def test_parse_assistant_reply_normalizes_message_content() -> None:
    raw = '{"kind":"message","content":"**Hi** there\\nHow many servings?"}'
    reply = parse_assistant_reply(raw)
    assert reply.assistant_text == "Hi there\nHow many servings?"

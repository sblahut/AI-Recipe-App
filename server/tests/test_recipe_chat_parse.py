from app.services.recipe_chat import parse_assistant_reply


def test_parse_clarifying_message() -> None:
    raw = '{"kind":"message","content":"How many people are you cooking for?"}'
    reply = parse_assistant_reply(raw)
    assert reply.kind == "message"
    assert "people" in reply.assistant_text.lower()
    assert reply.recipes == []


def test_parse_recipes_payload() -> None:
    raw = """{
      "kind": "recipes",
      "message": "Try these.",
      "recipes": [{
        "title": "Tomato Pasta",
        "servings": 4,
        "prep_minutes": 20,
        "ingredients": [{"name": "pasta", "quantity": "1 lb"}],
        "steps": ["Boil pasta."],
        "uses_from_pantry": [],
        "uses_from_publix_bogo": []
      }]
    }"""
    reply = parse_assistant_reply(raw)
    assert reply.recipes[0].title == "Tomato Pasta"
    assert reply.kind == "recipes"

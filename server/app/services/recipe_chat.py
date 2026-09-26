import json
from dataclasses import dataclass

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models import RecipeChatMessage, RecipeChatSession
from app.schemas import GeneratedRecipe
from app.services import ollama
from app.services.display_text import normalize_display_text, normalize_generated_recipe
from app.services.publix_bogo import PublixBogoError
from app.services.recipe_inventory_lines import gather_bogo_lines, gather_pantry_lines

MAX_CHAT_HISTORY_MESSAGES = 24

_RECIPE_SHAPE = """Each recipe object:
title (string), servings (integer or null), prep_minutes (integer or null),
ingredients (array of {name, quantity} where quantity is a string like "2 cups"),
steps (array of strings),
uses_from_pantry (array of strings),
uses_from_publix_bogo (array of strings)."""


@dataclass(frozen=True)
class RecipeChatOptions:
    use_pantry: bool
    use_publix_bogo: bool
    idea_query: str | None
    count: int
    constraints: str | None
    prioritize_expiring: bool
    publix_store_number: int | None


@dataclass(frozen=True)
class RecipeChatReply:
    kind: str
    assistant_text: str
    recipes: list[GeneratedRecipe]


def _build_context_block(
    db: Session,
    options: RecipeChatOptions,
) -> str:
    sections: list[str] = []
    idea = (options.idea_query or "").strip()
    if idea:
        sections.append(f"User recipe idea / theme: {idea}")

    if options.use_pantry:
        pantry_lines = gather_pantry_lines(db, prioritize_expiring=options.prioritize_expiring)
        pantry = "\n".join(f"- {line}" for line in pantry_lines) or "- (empty pantry)"
        sections.append(f"Pantry at home:\n{pantry}")
    else:
        sections.append("Pantry: not requested for this turn (general recipes OK).")

    if options.use_publix_bogo:
        sections.append("Publix BOGO: requested — deal list is included below when available.")
    else:
        sections.append("Publix BOGO: not requested for this turn.")

    if options.constraints:
        sections.append(f"Diet and style constraints: {options.constraints}")

    sections.append(
        f"When generating recipes, return up to {options.count} recipes unless the user asks for fewer."
    )
    return "\n\n".join(sections)


def _system_prompt(context: str) -> str:
    return f"""You are a home chef assistant in a family kitchen app. Help the user brainstorm and refine recipes.

Rules:
- Ask clarifying questions when the request is vague (servings, time, dietary needs, cuisine).
- When you have enough detail to propose recipes, return recipes as JSON (see format below).
- Refine earlier suggestions when the user asks to change ingredients, simplify steps, or adjust servings.
- Honor pantry and BOGO lists only when provided in context; do not invent pantry stock.
- {_RECIPE_SHAPE}

Response format — return ONLY one JSON object (no markdown fences, no ``` blocks):
{{"kind":"message","content":"your question or reply"}} OR
{{"kind":"recipes","message":"optional short intro","recipes":[...]}}

Plain text rules for all string fields (content, message, titles, steps):
- No markdown (no **, *, #, or backticks).
- Use real line breaks inside JSON strings when needed, not the two-character sequence backslash-n.
- Write steps as short plain sentences in the steps array, not one markdown blob.

Context for this turn:
{context}
"""


def parse_assistant_reply(raw: str) -> RecipeChatReply:
    text = raw.strip()
    if not text:
        raise ollama.OllamaError("Model returned an empty response")

    parsed: object
    try:
        parsed = ollama._extract_json(text)
    except ollama.OllamaError:
        return RecipeChatReply(
            kind="message", assistant_text=normalize_display_text(text), recipes=[]
        )

    if not isinstance(parsed, dict):
        return RecipeChatReply(kind="message", assistant_text=text, recipes=[])

    kind = parsed.get("kind")
    if kind == "message":
        content = parsed.get("content")
        if isinstance(content, str) and content.strip():
            return RecipeChatReply(
                kind="message",
                assistant_text=normalize_display_text(content),
                recipes=[],
            )
        return RecipeChatReply(
            kind="message", assistant_text=normalize_display_text(text), recipes=[]
        )

    recipes_raw = parsed.get("recipes")
    if recipes_raw is None and isinstance(parsed.get("title"), str):
        recipes_raw = [parsed]

    intro = parsed.get("message")
    intro_text = intro.strip() if isinstance(intro, str) else ""

    if isinstance(recipes_raw, list):
        recipes: list[GeneratedRecipe] = []
        for item in recipes_raw:
            if not isinstance(item, dict):
                continue
            try:
                recipes.append(normalize_generated_recipe(GeneratedRecipe.model_validate(item)))
            except ValidationError:
                continue
        if recipes:
            assistant_text = (
                normalize_display_text(intro_text)
                if intro_text
                else (f"Here are {len(recipes)} recipe idea(s).")
            )
            return RecipeChatReply(kind="recipes", assistant_text=assistant_text, recipes=recipes)

    content = parsed.get("content")
    if isinstance(content, str) and content.strip():
        return RecipeChatReply(
            kind="message",
            assistant_text=normalize_display_text(content),
            recipes=[],
        )

    return RecipeChatReply(kind="message", assistant_text=normalize_display_text(text), recipes=[])


async def _append_bogo_to_context(options: RecipeChatOptions, context: str) -> str:
    if not options.use_publix_bogo:
        return context
    try:
        bogo_lines = await gather_bogo_lines(publix_store_number=options.publix_store_number)
    except PublixBogoError as e:
        raise ollama.OllamaError(str(e)) from e
    deals = "\n".join(f"- {line}" for line in bogo_lines) or "- (no BOGO items found)"
    return f"{context}\n\nPublix BOGO deals this week:\n{deals}"


def _ollama_messages(history: list[RecipeChatMessage], system: str) -> list[dict[str, str]]:
    rows = history[-MAX_CHAT_HISTORY_MESSAGES:]
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for row in rows:
        if row.role not in {"user", "assistant"}:
            continue
        content = row.content.strip()
        if row.role == "assistant" and row.recipes_json:
            try:
                recipes = json.loads(row.recipes_json)
                if isinstance(recipes, list) and recipes:
                    titles = [r.get("title", "Recipe") for r in recipes if isinstance(r, dict)]
                    suffix = f" [Proposed recipes: {', '.join(titles)}]"
                    content = (content + suffix).strip()
            except json.JSONDecodeError:
                pass
        if content:
            messages.append({"role": row.role, "content": content})
    return messages


def load_session_messages(db: Session, session_id: int) -> list[RecipeChatMessage]:
    return (
        db.query(RecipeChatMessage)
        .filter(RecipeChatMessage.session_id == session_id)
        .order_by(RecipeChatMessage.id)
        .all()
    )


def _truncate_preview(text: str, max_len: int = 80) -> str:
    cleaned = normalize_display_text(text).replace("\n", " ").strip()
    if not cleaned:
        return "Chef chat"
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 3].rstrip() + "..."


def chat_session_preview(db: Session, session_id: int) -> str:
    first_user = (
        db.query(RecipeChatMessage)
        .filter(RecipeChatMessage.session_id == session_id, RecipeChatMessage.role == "user")
        .order_by(RecipeChatMessage.id)
        .first()
    )
    if first_user:
        return _truncate_preview(first_user.content)
    first_any = (
        db.query(RecipeChatMessage)
        .filter(RecipeChatMessage.session_id == session_id)
        .order_by(RecipeChatMessage.id)
        .first()
    )
    if first_any:
        return _truncate_preview(first_any.content)
    return "Chef chat"


def list_chat_sessions(db: Session, *, limit: int = 50) -> list[tuple[RecipeChatSession, int, str]]:
    sessions = (
        db.query(RecipeChatSession).order_by(RecipeChatSession.updated_at.desc()).limit(limit).all()
    )
    summaries: list[tuple[RecipeChatSession, int, str]] = []
    for session in sessions:
        count = (
            db.query(RecipeChatMessage).filter(RecipeChatMessage.session_id == session.id).count()
        )
        if count == 0:
            continue
        summaries.append((session, count, chat_session_preview(db, session.id)))
    return summaries


async def send_recipe_chat_message(
    db: Session,
    *,
    session: RecipeChatSession,
    user_message: str,
    options: RecipeChatOptions,
) -> RecipeChatReply:
    trimmed = user_message.strip()
    if not trimmed:
        raise ollama.OllamaError("Message is empty")

    if options.use_pantry and not gather_pantry_lines(db, prioritize_expiring=False):
        raise ollama.OllamaError(
            "No pantry ingredients available. Add items on the Pantry tab or turn off pantry."
        )

    history = load_session_messages(db, session.id)

    context = _build_context_block(db, options)
    context = await _append_bogo_to_context(options, context)
    system = _system_prompt(context)

    ollama_messages = _ollama_messages(history, system)
    ollama_messages.append({"role": "user", "content": trimmed})

    raw = await ollama.chat_completion(ollama_messages, temperature=0.55)
    reply = parse_assistant_reply(raw)

    recipes_json = None
    if reply.recipes:
        recipes_json = json.dumps([r.model_dump() for r in reply.recipes])

    db.add(RecipeChatMessage(session_id=session.id, role="user", content=trimmed))
    db.add(
        RecipeChatMessage(
            session_id=session.id,
            role="assistant",
            content=reply.assistant_text,
            recipes_json=recipes_json,
        )
    )
    db.commit()
    return reply


def create_chat_session(db: Session) -> RecipeChatSession:
    row = RecipeChatSession()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

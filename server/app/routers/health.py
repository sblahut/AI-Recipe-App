from fastapi import APIRouter

from app.services import ollama

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "ollama": await ollama.ollama_reachable(),
    }

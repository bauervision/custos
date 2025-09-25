import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import fastapi
from kloak import Kloak
from kloak.data.history_management import AllHistoryManagement

# Logging Setup
from kloak.data.knex_prompt import KnexResponse
from kloak.util import logger
from typing_extensions import TypedDict

from scrim_bot.agents import AssistantAgent
from scrim_bot.kloak_util import get_kloak
from scrim_bot.utils.enums import FLASH, LITE, PRO
from scrim_bot.utils.logger_patch import patch_kloak_loggers_for_utf8

THIS_DIR = Path(__file__).parent

# Global resources
kloak: Kloak | None = None
history_manager: AllHistoryManagement | None = None
assistant: AssistantAgent | None = None


@asynccontextmanager
async def lifespan(_app: fastapi.FastAPI):
    """Lifespan manager for the FastAPI application."""
    global kloak
    global history_manager
    global assistant
    logger.info("Initializing Kloak...")
    kloak = get_kloak()
    history_manager = AllHistoryManagement()
    assistant = AssistantAgent(kloak, FLASH, history_manager=history_manager)
    yield
    logger.info("Shutting down Kloak...")


app = fastapi.FastAPI(title="ScrimBot", redirect_slashes=False, lifespan=lifespan)


class ChatRequest(TypedDict):
    content: str


class ChatMessage(TypedDict):
    role: Literal["user", "assistant"]
    content: str
    content_type: Literal["text", "report", "json"]


@app.get("/health")
async def health():
    if kloak is None:
        return {"status": "error", "message": "Kloak not initialized"}
    return {"status": "ok"}


@app.post("/chat")
async def chat(message: ChatRequest) -> ChatMessage:
    """
    Handle a chat message.

    Args:
            message (ChatRequest): The chat message to handle.

    """
    response = await assistant.async_chat(message["content"])  # pyright: ignore[reportOptionalMemberAccess]
    if isinstance(response, KnexResponse):
        return ChatMessage(
            role="assistant", content=str(response.text), content_type="text"
        )
    if isinstance(response, list):
        full_response = "\n".join([str(resp.text) for resp in response])
        return ChatMessage(role="assistant", content=full_response, content_type="text")
    if isinstance(response, dict):
        return ChatMessage(
            role="assistant", content=json.dumps(response), content_type="json"
        )
    logger.info(f"Response({type(response)}): {response}")
    raise ValueError("Invalid response type")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

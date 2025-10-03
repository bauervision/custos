#!/usr/bin/env python3
"""
TUI Chat Client using Textual Framework

A terminal user interface for interacting with a FastAPI chat server.
Supports both synchronous and asynchronous communication modes.
"""

import argparse
import asyncio
import json
import logging
from datetime import datetime
from typing import Any

import httpx
from rich.console import RenderableType
from rich.json import JSON
from rich.markdown import Markdown
from rich.panel import Panel
from textual import on, work
from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.logging import TextualHandler
from textual.reactive import reactive
from textual.visual import VisualType
from textual.widgets import (
    Button,
    Footer,
    Header,
    Input,
    Label,
    RichLog,
    Static,
    Switch,
)

# Configure logging
logger = logging.getLogger(__name__)


class ChatMessage(Static):
    """Widget to display a single chat message with proper formatting."""

    def __init__(
        self,
        content: str,
        sender: str = "user",
        timestamp: str | None = None,
        response_type: str = "text",
        **kwargs,
    ) -> None:
        """
        Initialize a chat message widget.

        Args:
            content: The message content
            sender: Either "user" or "assistant"
            timestamp: Optional timestamp string
            response_type: Type of response ("text", "markdown", "json")
            kwargs: Additional keyword arguments for the parent class (Static)

        """
        super().__init__(**kwargs)
        self.content = content
        self.sender = sender
        self.timestamp = timestamp or datetime.now().strftime("%H:%M:%S")
        self.response_type: RenderableType = response_type

    def render(self) -> RenderableType:
        """Render the message with appropriate formatting."""
        # Format content based on response type
        if self.response_type == "json":
            try:
                # parsed = json.loads(self.content)
                formatted_content = Markdown(self.content)
                # formatted_content = JSON.from_data(parsed, highlight=True, indent=2)
            except json.JSONDecodeError:
                formatted_content = Markdown(self.content)
        elif self.response_type == "markdown":
            formatted_content = Markdown(self.content)
        else:
            formatted_content = self.content

        # Create panel with sender-specific styling
        if self.sender == "user":
            panel = Panel(
                formatted_content,
                title=f"[bold cyan]You[/bold cyan] • {self.timestamp}",
                border_style="cyan",
                padding=(0, 1),
            )
        else:
            panel = Panel(
                formatted_content,
                title=f"[bold green]Assistant[/bold green] • {self.timestamp}",
                border_style="green",
                padding=(0, 1),
            )

        return panel


class ChatClient:
    """Handles communication with the FastAPI chat server."""

    def __init__(
        self, base_url: str = "http://localhost:8000", debug: bool = False
    ) -> None:
        """
        Initialize the chat client.

        Args:
            base_url: Base URL of the FastAPI server
            debug: Enable debug logging

        """
        self.base_url = base_url
        self.debug = debug
        self.session = httpx.Client(timeout=30.0)
        self.async_session = httpx.AsyncClient(timeout=30.0)

        if debug:
            logger.setLevel(logging.DEBUG)

    def check_health_sync(self) -> tuple[bool, str]:
        """
        Check if the server is healthy (synchronous).

        Returns:
            Tuple of (is_healthy, message)

        """
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5.0)
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "ok":
                return True, "Server is healthy"
            return False, f"Server error: {data.get('message', 'Unknown error')}"
        except httpx.ConnectError:
            return False, f"Cannot connect to server at {self.base_url}"
        except httpx.TimeoutException:
            return False, "Server connection timed out"
        except Exception as e:
            return False, f"Health check failed: {e!s}"

    async def check_health_async(self) -> tuple[bool, str]:
        """
        Check if the server is healthy (asynchronous).

        Returns:
            Tuple of (is_healthy, message)

        """
        try:
            response = await self.async_session.get(
                f"{self.base_url}/health", timeout=5.0
            )
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "ok":
                return True, "Server is healthy"
            return False, f"Server error: {data.get('message', 'Unknown error')}"
        except httpx.ConnectError:
            return False, f"Cannot connect to server at {self.base_url}"
        except httpx.TimeoutException:
            return False, "Server connection timed out"
        except Exception as e:
            return False, f"Health check failed: {e!s}"

    def send_message_sync(self, message: str) -> dict[str, Any]:
        """
        Send a message synchronously to the chat server.

        Args:
            message: The message to send

        Returns:
            Response from the server

        """
        logger.debug(f"Sending sync message: {message[:50]}...")

        try:
            # Make actual API call to the FastAPI server
            response = self.session.post(
                f"{self.base_url}/chat", json={"content": message}, timeout=600
            )
            response.raise_for_status()

            # Parse the response
            data = response.json()

            # Map content_type to the format expected by the TUI
            content_type = data.get("content_type", "text")
            content = data.get("content", "")

            # Map the server's content_type to TUI's response type
            type_mapping = {
                "text": "text",
                "report": "markdown",  # Treat reports as markdown
                "json": "json",
            }

            response_type = type_mapping.get(content_type, "text")

            # If the content is JSON type and it's a string, ensure it's properly formatted
            if response_type == "json" and isinstance(content, str):
                try:
                    # Try to parse and re-stringify for proper formatting
                    parsed = json.loads(content)
                    content = json.dumps(parsed, indent=2)
                except json.JSONDecodeError:
                    # If it's not valid JSON, treat as text
                    response_type = "text"

            return {"type": response_type, "content": content}

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in sync request: {e}")
            error_msg = f"Server error: {e.response.status_code}"
            try:
                error_detail = e.response.json().get("detail", e.response.text)
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {e.response.text}"
            return {
                "type": "text",
                "content": error_msg,
            }
        except httpx.ConnectError:
            logger.error(f"Connection error: Cannot reach server at {self.base_url}")
            return {
                "type": "text",
                "content": f"❌ Connection failed: Cannot reach server at {self.base_url}. Is the server running?",
            }
        except httpx.TimeoutException:
            logger.error("Request timeout")
            return {
                "type": "text",
                "content": "⏱️ Request timed out. The server might be overloaded.",
            }
        except Exception as e:
            logger.error(f"Error in sync request: {e}")
            return {"type": "text", "content": f"Error: {e!s}"}

    async def send_message_async(self, message: str) -> dict[str, Any]:
        """
        Send a message asynchronously to the chat server.

        Args:
            message: The message to send

        Returns:
            Response from the server

        """
        logger.debug(f"Sending async message: {message[:50]}...")

        try:
            # Make actual API call to the FastAPI server
            response = await self.async_session.post(
                f"{self.base_url}/chat", json={"content": message}, timeout=None
            )
            response.raise_for_status()

            # Parse the response
            data = response.json()

            # Map content_type to the format expected by the TUI
            content_type = data.get("content_type", "text")
            content = data.get("content", "")

            # Map the server's content_type to TUI's response type
            type_mapping = {
                "text": "text",
                "report": "markdown",  # Treat reports as markdown
                "json": "json",
            }

            response_type = type_mapping.get(content_type, "text")

            # If the content is JSON type and it's a string, ensure it's properly formatted
            if response_type == "json" and isinstance(content, str):
                try:
                    # Try to parse and re-stringify for proper formatting
                    parsed = json.loads(content)
                    content = json.dumps(parsed, indent=2)
                except json.JSONDecodeError:
                    # If it's not valid JSON, treat as text
                    response_type = "text"

            return {"type": response_type, "content": content}

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in async request: {e}")
            error_msg = f"Server error: {e.response.status_code}"
            try:
                error_detail = e.response.json().get("detail", e.response.text)
                error_msg += f" - {error_detail}"
            except:
                error_msg += f" - {e.response.text}"
            return {
                "type": "text",
                "content": error_msg,
            }
        except httpx.ConnectError:
            logger.error(f"Connection error: Cannot reach server at {self.base_url}")
            return {
                "type": "text",
                "content": f"❌ Connection failed: Cannot reach server at {self.base_url}. Is the server running?",
            }
        except httpx.TimeoutException:
            logger.error("Request timeout")
            return {
                "type": "text",
                "content": "⏱️ Request timed out. The server might be overloaded.",
            }
        except Exception as e:
            logger.error(f"Error in async request: {e}")
            return {"type": "text", "content": f"Error: {e!s}"}

    def close(self):
        """Close the HTTP clients."""
        self.session.close()
        asyncio.run(self.async_session.aclose())


class ChatTUI(App):
    """Main TUI application for the chat client."""

    CSS = """
    Screen {
        background: $surface;
    }

    #chat-container {
        height: 100%;
        width: 100%;
        padding: 1;
    }

    #messages {
        height: 1fr;
        background: $panel;
        border: solid $primary;
        overflow-y: scroll;
        padding: 1;
    }

    #input-area {
        height: auto;
        dock: bottom;
        padding: 1 0;
    }

    #chat-input {
        width: 1fr;
        margin-right: 1;
    }

    #send-button {
        width: auto;
        min-width: 10;
    }

    #status-bar {
        height: 3;
        background: $panel;
        border: solid $secondary;
        padding: 0 1;
        margin-bottom: 1;
    }

    .status-item {
        width: auto;
        margin-right: 2;
    }

    #connection-status {
        dock: right;
        width: auto;
        height: 3;
        padding: 0 1;
        text-align: center;
        margin: 0 1;
    }

    .connection-connected {
        background: green;
        color: white;
    }

    .connection-disconnected {
        background: red;
        color: white;
    }

    .connection-connecting {
        background: cyan;
        color: black;
    }

    #loading-indicator {
        width: 100%;
        text-align: center;
        padding: 1 0;
        color: $accent;
    }

    ChatMessage {
        width: 100%;
        margin-bottom: 1;
    }

    RichLog {
        background: $panel;
        border: solid $warning;
        height: 10;
        display: none;
    }

    RichLog.visible {
        display: block;
    }
    """

    BINDINGS = [
        ("ctrl+c", "quit", "Quit"),
        ("ctrl+d", "toggle_debug", "Toggle Debug"),
        ("ctrl+l", "clear_chat", "Clear Chat"),
    ]

    def __init__(
        self,
        async_mode: bool = False,
        debug: bool = False,
        base_url: str = "http://localhost:8000",
        **kwargs,
    ):
        """
        Initialize the TUI application.

        Args:
            async_mode: Use asynchronous communication
            debug: Enable debug mode
            base_url: Base URL of the chat server

        """
        super().__init__(**kwargs)
        self.async_mode = async_mode
        self.debug_mode = debug
        self.client = ChatClient(base_url=base_url, debug=debug)
        self.message_count = 0
        self.connection_status = (
            "disconnected"  # "connected", "disconnected", "connecting"
        )
        self.health_check_timer = None
        self.loading_dots_timer = None
        self.loading_dots_state = 0
        self.is_waiting_for_response = False

    def compose(self) -> ComposeResult:
        """Compose the TUI layout."""
        yield Header()

        # Connection status indicator in top right
        yield Label("●", id="connection-status", classes="connection-disconnected")

        with Vertical(id="chat-container"):
            # Status bar
            with Horizontal(id="status-bar"):
                yield Label(
                    f"Mode: {'Async' if self.async_mode else 'Sync'}",
                    classes="status-item",
                )
                yield Label(
                    f"Debug: {'ON' if self.debug_mode else 'OFF'}",
                    id="debug-status",
                    classes="status-item",
                )
                yield Label("Messages: 0", id="message-counter", classes="status-item")

            # Messages display area
            yield VerticalScroll(id="messages")

            # Loading indicator (initially hidden)
            yield Label("", id="loading-indicator")

            # Debug log (initially hidden)
            yield RichLog(
                id="debug-log",
                wrap=True,
                highlight=True,
                markup=True,
                classes="" if self.debug_mode else "",
            )

            # Input area
            with Horizontal(id="input-area"):
                yield Input(placeholder="Type your message here...", id="chat-input")
                yield Button("Send", variant="primary", id="send-button")

        yield Footer()

    async def on_mount(self) -> None:
        """Set up the app when mounted."""
        self.title = "AI Chat Client"
        self.sub_title = f"Mode: {'Async' if self.async_mode else 'Sync'}"

        if self.debug_mode:
            self.query_one("#debug-log").add_class("visible")
            self.log_debug("Debug mode enabled")

        # Start health monitoring
        self.start_health_monitoring()

        # Initial connection check
        await self.check_connection_status()

        # Check server health for welcome message
        self.log_debug(f"Checking server health at {self.client.base_url}...")

        if self.async_mode:
            is_healthy, message = await self.client.check_health_async()
        else:
            is_healthy, message = await asyncio.to_thread(self.client.check_health_sync)

        if is_healthy:
            self.log_debug(f"✅ {message}")
            # Add a welcome message to the chat
            messages_container = self.query_one("#messages", VerticalScroll)
            welcome_msg = ChatMessage(
                content=f"Connected to server at {self.client.base_url}. Ready to chat!",
                sender="assistant",
                response_type="text",
            )
            await messages_container.mount(welcome_msg)
        else:
            self.log_debug(f"❌ {message}")
            # Show error message in chat
            messages_container = self.query_one("#messages", VerticalScroll)
            error_msg = ChatMessage(
                content=f"⚠️ Server connection issue: {message}\n\nYou can still send messages, but they may fail until the server is available.",
                sender="assistant",
                response_type="text",
            )
            await messages_container.mount(error_msg)

        # Focus on the input field
        self.query_one("#chat-input", Input).focus()

    def log_debug(self, message: str) -> None:
        """Log a debug message if debug mode is enabled."""
        if self.debug_mode:
            debug_log = self.query_one("#debug-log", RichLog)
            timestamp = datetime.now().strftime("%H:%M:%S")
            debug_log.write(f"[dim cyan][{timestamp}][/] {message}")

    def start_health_monitoring(self) -> None:
        """Start periodic health checks."""
        self.health_check_timer = self.set_interval(120.0, self.check_connection_status)

    async def check_connection_status(self) -> None:
        """Check server connection status and update indicator."""
        # Update status to connecting
        self.update_connection_indicator("connecting")

        try:
            if self.async_mode:
                is_healthy, message = await self.client.check_health_async()
            else:
                is_healthy, message = await asyncio.to_thread(
                    self.client.check_health_sync
                )

            if is_healthy:
                self.update_connection_indicator("connected")
                self.log_debug("Connection check: Server is healthy")
            else:
                self.update_connection_indicator("disconnected")
                self.log_debug(f"Connection check failed: {message}")

        except Exception as e:
            self.update_connection_indicator("disconnected")
            self.log_debug(f"Connection check error: {e!s}")

    def update_connection_indicator(self, status: str) -> None:
        """Update the connection status indicator."""
        self.connection_status = status
        indicator = self.query_one("#connection-status", Label)

        if status == "connected":
            indicator.update("●")
            indicator.remove_class("connection-disconnected")
            indicator.remove_class("connection-connecting")
            indicator.add_class("connection-connected")
        elif status == "disconnected":
            indicator.update("●")
            indicator.remove_class("connection-connected")
            indicator.remove_class("connection-connecting")
            indicator.add_class("connection-disconnected")
        elif status == "connecting":
            indicator.update("●")
            indicator.remove_class("connection-connected")
            indicator.remove_class("connection-disconnected")
            indicator.add_class("connection-connecting")

    def start_loading_indicator(self) -> None:
        """Start the loading animation."""
        self.is_waiting_for_response = True
        self.loading_dots_state = 0
        self.loading_dots_timer = self.set_interval(0.5, self.update_loading_indicator)

    def stop_loading_indicator(self) -> None:
        """Stop the loading animation."""
        self.is_waiting_for_response = False
        if self.loading_dots_timer:
            self.loading_dots_timer.stop()
            self.loading_dots_timer = None

        loading_indicator = self.query_one("#loading-indicator", Label)
        loading_indicator.update("")

    def update_loading_indicator(self) -> None:
        """Update the loading animation."""
        if not self.is_waiting_for_response:
            return

        dots = ["   ", ".  ", ".. ", "..."]
        self.loading_dots_state = (self.loading_dots_state + 1) % len(dots)

        loading_indicator = self.query_one("#loading-indicator", Label)
        loading_indicator.update(
            f"Assistant is thinking{dots[self.loading_dots_state]}"
        )

    @on(Input.Submitted, "#chat-input")
    async def handle_input_submitted(self, event: Input.Submitted) -> None:
        """Handle input submission."""
        self.send_message(event.value)

    @on(Button.Pressed, "#send-button")
    async def handle_send_button(self) -> None:
        """Handle send button press."""
        input_widget = self.query_one("#chat-input", Input)
        self.send_message(input_widget.value)

    @work
    async def send_message(self, message: str) -> None:
        """
        Send a message to the server and display the response.

        Args:
            message: The message to send

        """
        if not message.strip():
            return

        # Clear input
        input_widget = self.query_one("#chat-input", Input)
        input_widget.value = ""

        # Add user message to chat
        messages_container = self.query_one("#messages", VerticalScroll)
        user_msg = ChatMessage(content=message, sender="user", response_type="text")
        await messages_container.mount(user_msg)
        messages_container.scroll_end()

        # Update message counter
        self.message_count += 1
        self.query_one("#message-counter", Label).update(
            f"Messages: {self.message_count}"
        )

        # Log the sending action
        self.log_debug(f"Sending message: {message[:50]}...")

        # Start loading indicator
        self.start_loading_indicator()

        # Send message to server
        try:
            if self.async_mode:
                self.log_debug("Using async mode")
                response = await self.client.send_message_async(message)
            else:
                self.log_debug("Using sync mode")
                response = await asyncio.to_thread(
                    self.client.send_message_sync, message
                )

            # Extract response content and type
            response_type = response.get("type", "text")
            content = response.get("content", "No response content")

            self.log_debug(f"Received response type: {response_type}")

            # Add assistant response to chat
            assistant_msg = ChatMessage(
                content=content, sender="assistant", response_type=response_type
            )
            await messages_container.mount(assistant_msg)
            messages_container.scroll_end()

            # Update message counter
            self.message_count += 1
            self.query_one("#message-counter", Label).update(
                f"Messages: {self.message_count}"
            )

        except Exception as e:
            self.log_debug(f"Unexpected error: {e!s}")
            error_msg = ChatMessage(
                content=f"⚠️ Unexpected error: {e!s}",
                sender="assistant",
                response_type="text",
            )
            await messages_container.mount(error_msg)
            messages_container.scroll_end()

            # Check connection status on error
            await self.check_connection_status()

        finally:
            # Stop loading indicator
            self.stop_loading_indicator()

        # Refocus on input
        input_widget.focus()

    def action_toggle_debug(self) -> None:
        """Toggle debug mode."""
        self.debug_mode = not self.debug_mode
        debug_log = self.query_one("#debug-log", RichLog)

        if self.debug_mode:
            debug_log.add_class("visible")
            self.log_debug("Debug mode enabled")
        else:
            debug_log.remove_class("visible")

        # Update status
        self.query_one("#debug-status", Label).update(
            f"Debug: {'ON' if self.debug_mode else 'OFF'}"
        )

    def action_clear_chat(self) -> None:
        """Clear all chat messages."""
        messages_container = self.query_one("#messages", VerticalScroll)
        messages_container.remove_children()
        self.message_count = 0
        self.query_one("#message-counter", Label).update("Messages: 0")
        self.log_debug("Chat cleared")

    def action_quit(self) -> None:
        """Quit the application."""
        # Stop timers
        if self.health_check_timer:
            self.health_check_timer.stop()
        if self.loading_dots_timer:
            self.loading_dots_timer.stop()

        self.client.close()
        self.exit()


def main():
    """Main entry point for the TUI chat client."""
    parser = argparse.ArgumentParser(
        description="TUI Chat Client for FastAPI Server",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    parser.add_argument(
        "--async",
        action="store_true",
        dest="async_mode",
        help="Use asynchronous mode for API requests",
    )

    parser.add_argument("--debug", action="store_true", help="Enable debug messages")

    parser.add_argument(
        "--url",
        type=str,
        default="http://localhost:8000",
        help="Base URL of the FastAPI chat server",
    )

    args = parser.parse_args()

    # Configure logging
    if args.debug:
        logging.basicConfig(
            level=logging.DEBUG,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[TextualHandler()],
        )
    else:
        logging.basicConfig(level=logging.INFO, handlers=[TextualHandler()])

    # Create and run the app
    app = ChatTUI(async_mode=args.async_mode, debug=args.debug, base_url=args.url)

    app.run()


if __name__ == "__main__":
    main()

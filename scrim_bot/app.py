import asyncio
from argparse import ArgumentParser, Namespace

from google.genai import types
from kloak.agent import visualize_agents
from kloak.data import KnexusGenConfig
from kloak.data.history_management import AllHistoryManagement

# Logging Setup
from kloak.util import logger

from scrim_bot.agents import AssistantAgent
from scrim_bot.kloak_util import get_kloak
from scrim_bot.utils.enums import FLASH, LITE, PRO
from scrim_bot.utils.logger_patch import patch_kloak_loggers_for_utf8

patch_kloak_loggers_for_utf8()


def parse_args() -> Namespace:
    """Parse command line arguments."""
    parser = ArgumentParser(description="Vendor Vetting Agent")
    parser.add_argument(
        "--visualize", action="store_true", help="Enable agent visualization"
    )
    return parser.parse_args()


def main(args: Namespace) -> None:
    """Main entrypoint"""
    history_manager = AllHistoryManagement()
    # Initialize Kloak
    kloak = get_kloak()

    # Initialize the Orchestrator Agent
    assistant = AssistantAgent(kloak, FLASH, history_manager=history_manager)

    # Visualize the agent graph if requested
    if args.visualize:
        visualize_agents([assistant])

    # Start the chat
    while True:
        prompt = input("User: ")
        if prompt.lower() in ["exit", "quit"]:
            break
        response = assistant.chat(prompt)
        # response = await assistant.async_chat(prompt)
        logger.info(f"Agent: {response}")


if __name__ == "__main__":
    cmdline_args = parse_args()
    main(cmdline_args)
    # asyncio.run(main(cmdline_args))

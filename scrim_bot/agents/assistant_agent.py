from google.genai import types
from kloak import Kloak
from kloak.agent import Agent
from kloak.data import KnexResponse, Schema, SupportedModels, KnexusGenConfig
from kloak.data.history_management import HistoryManagement

from scrim_bot.prompts import ASSISTANT_INSTRUCTIONS
from scrim_bot.agents.heavy_research_agent import (
    HeavyResearchAgent,
)
from scrim_bot.utils.enums import PRO


class AssistantAgent(Agent[KnexResponse]):
    def __init__(
        self,
        kloak: Kloak,
        agent_model: SupportedModels,
        history_manager: HistoryManagement,
    ):
        """
        Initialize the AssistantAgent.

        Args:
            kloak (Kloak): The Kloak instance.
            agent_model (SupportedModels): The model to use for the agent.
            history_manager (HistoryManagement): The history manager to use for the
                agent.

        """
        super().__init__(kloak=kloak, agent_name="assistant", agent_model=agent_model)
        self._researcher: HeavyResearchAgent = HeavyResearchAgent(
            kloak, PRO, history_manager=history_manager
        )

    @property
    def agent_description(self) -> str:
        """
        Description of the AssistantAgent.

        Returns:
            str: The description of the AssistantAgent.

        """
        return "Orchestrates the vendor vetting process."

    @property
    def prompt(self) -> str:
        return ASSISTANT_INSTRUCTIONS

    @property
    def agents(self) -> list[Agent[str]]:
        return [self._researcher]

from google.genai import types
from kloak.agent import Agent, visualize_agents
from kloak.data import KnexTool, Schema, SchemaEntry, SupportedModels
from kloak.kloak import Kloak
from kloak.util import logger

from scrim_bot.prompts import (
    CAPABILITY_RESEARCHER_INSTRUCTIONS,
    FINANCE_RESEARCHER_INSTRUCTIONS,
    POLITICAL_RESEARCHER_INSTRUCTIONS,
    SECURITY_RESEARCHER_INSTRUCTIONS,
)
from scrim_bot.schemas import ResearchReport


class ResearchAgent(Agent[str]):
    def __init__(
        self,
        kloak: Kloak,
        agent_name: str,
        agent_model: SupportedModels,
        research_type: str,
    ):
        super().__init__(kloak=kloak, agent_name=agent_name, agent_model=agent_model)
        self.research_type = research_type
        self.research_query: str | None = None

    @property
    def agent_description(self) -> str:
        return f"Gathers information about vendor firms from a {self.research_type} perspective."

    @property
    def prompt(self) -> str:
        if self.research_type == "finance":
            return FINANCE_RESEARCHER_INSTRUCTIONS.format(
                finance_query=self.research_query
            )
        if self.research_type == "political":
            return POLITICAL_RESEARCHER_INSTRUCTIONS.format(
                political_query=self.research_query
            )
        if self.research_type == "capability":
            return CAPABILITY_RESEARCHER_INSTRUCTIONS.format(
                capability_query=self.research_query
            )
        if self.research_type == "security":
            return SECURITY_RESEARCHER_INSTRUCTIONS.format(
                security_query=self.research_query
            )
        raise ValueError(f"Unknown research type: {self.research_type}")

    # def chat(self, prompt: str | None = None, **kwargs) -> str:
    #     response = super().chat(prompt=prompt, **kwargs)
    #     logger.debug(f"Researcher {self.agent_name} response: {response}")
    #     return response

    @property
    def response_schema(self) -> Schema:
        return ResearchReport.to_schema_obj()

    def set_research_query(self, research_query: str):
        self.research_query = research_query

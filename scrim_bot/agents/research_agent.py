from kloak.agent import Agent, visualize_agents
from kloak.data import KnexTool, Schema, SchemaEntry, SupportedModels
from kloak.kloak import Kloak
from kloak.util import logger

from scrim_bot.prompts import (
    BABEL_INST_V2,
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
        babel_doc_search_agent: Agent | None = None,
        google_search_agent: Agent | None = None
    ):
        super().__init__(kloak=kloak, agent_name=agent_name, agent_model=agent_model)
        self.research_type = research_type
        self.research_query: str | None = None
        self.babel_doc_search_agent = babel_doc_search_agent
        self.google_search_agent = google_search_agent

    @property
    def agents(self) -> list[Agent]: # New property to expose babel_search_agent
        return [self.babel_doc_search_agent, self.google_search_agent]

    @property
    def agent_description(self) -> str:
        return f"Gathers information about vendor firms from a {self.research_type} perspective."

    @property
    def prompt(self) -> str:
        if self.research_type == "finance":
            base_instructions = FINANCE_RESEARCHER_INSTRUCTIONS.format(
                finance_query=self.research_query
            )
        elif self.research_type == "political":
            base_instructions = POLITICAL_RESEARCHER_INSTRUCTIONS.format(
                political_query=self.research_query
            )
        elif self.research_type == "capability":
            base_instructions = CAPABILITY_RESEARCHER_INSTRUCTIONS.format(
                capability_query=self.research_query
            )
        elif self.research_type == "security":
            base_instructions = SECURITY_RESEARCHER_INSTRUCTIONS.format(
                security_query=self.research_query
            )
        else:
            raise ValueError(f"Unknown research type: {self.research_type}")

        # Append instructions for using babel_doc_search_agent
        babbel_instructions = BABEL_INST_V2.format(research_type=self.research_type)
        return base_instructions + babbel_instructions

    # def chat(self, prompt: str | None = None, **kwargs) -> str:
    #     response = super().chat(prompt=prompt, **kwargs)
    #     logger.debug(f"Researcher {self.agent_name} response: {response}")
    #     return response

    @property
    def response_schema(self) -> Schema:
        return ResearchReport.to_schema_obj()

    def set_research_query(self, research_query: str):
        self.research_query = research_query

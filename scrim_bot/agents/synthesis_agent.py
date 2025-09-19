from typing import override

from kloak.agent import Agent
from kloak.data import Schema, SupportedModels
from kloak.data.history_management import HistoryManagement
from kloak.kloak import Kloak

from scrim_bot.prompts import SYNTHESIS_INSTRUCTIONS
from scrim_bot.schemas import ResearchReport


class SynthesisAgent(Agent[str]):
    def __init__(
        self,
        kloak: Kloak,
        agent_model: SupportedModels,
        **kwargs,
    ):
        super().__init__(
            kloak=kloak, agent_name="synthesis", agent_model=agent_model, **kwargs
        )
        self.research_reports: dict[str, str] | None = None

    @property
    def agent_description(self) -> str:
        return "Synthesizes research from multiple agents into a single report."

    @property
    def prompt(self) -> str:
        match self.research_reports:
            case None:
                return SYNTHESIS_INSTRUCTIONS
            case _:
                return SYNTHESIS_INSTRUCTIONS.format(**self.research_reports)

    @property
    def response_schema(self) -> Schema:
        return ResearchReport.to_schema_obj()

    @override
    def chat(self, research_reports: dict[str, str] | None = None, **kwargs):
        self.research_reports = research_reports
        return super().chat(**kwargs)

    @override
    async def async_chat(
        self, research_reports: dict[str, str] | None = None, **kwargs
    ):
        self.research_reports = research_reports
        return super().async_chat(**kwargs)

    def _process_response(self, response) -> ResearchReport:
        return ResearchReport.from_dict(response.to_schema_permissive(ResearchReport))

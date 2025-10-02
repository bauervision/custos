from kloak.agent import Agent
from kloak.data import KnexResponse, KnexTool, Schema, SchemaEntry, SupportedModels

from scrim_bot.prompts import DIRECTOR_INSTRUCTIONS, DIRECTOR_INSTRUCTIONS_V2
from scrim_bot.schemas import ResearchQuery


class DirectorAgent(Agent[ResearchQuery]):
    def __init__(self, kloak, agent_model, **kwargs):
        super().__init__(
            kloak=kloak, agent_name="director", agent_model=agent_model, **kwargs
        )

    @property
    def agent_description(self) -> str:
        return "Decomposes a research tasks into smaller subtasks."

    @property
    def prompt(self) -> str:
        return DIRECTOR_INSTRUCTIONS_V2

    @property
    def response_schema(self) -> Schema:
        return ResearchQuery.to_schema_obj()

    def _process_response(self, response: KnexResponse) -> ResearchQuery:
        # print(f"Agent[{self.agent_name}] Response: {response}")
        return ResearchQuery.from_dict(response.to_schema_permissive(ResearchQuery))

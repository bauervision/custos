from kloak.agent import Agent
from kloak.data import KnexTool
from kloak.util import logger
from typing import TypeVar

from scrim_bot.kloak_util import get_gkloak
from scrim_bot.prompts import GOOGLE_SEARCH_AGENT_INS
from scrim_bot.utils.enums import FLASH
from kloak.data import MultiKnexResponse

ResponseType = TypeVar("ResponseType")

class GoogleSearchAgent(Agent):

    def __init__(self, agent_name, agent_model):
        super().__init__(kloak=get_gkloak(), agent_name=agent_name, agent_model=agent_model)
        print(self._config)

    @property
    def agent_description(self) -> str:
        return f"Gathers information about any topic using Google Search"

    @property
    def prompt(self):
        return GOOGLE_SEARCH_AGENT_INS

    # @property
    # def tools(self) -> list[KnexTool]:
    #     return [types.GoogleSearch()]


    def chat(self, prompt: str | None = None, **kwargs) -> ResponseType | list[ResponseType]:
        """Chat with the agent."""
        res = self._kloak.generate_content(
            prompt=self.prompt,
            model=self._agent_model,
            user_prompt=prompt,
        )
        if isinstance(res, MultiKnexResponse):
            return [self._process_response(r) for r in res.responses]
        return self._process_response(res)


def main():
    ask = "Could you please tell me what the most recent price of SPY was?"
    gsa = GoogleSearchAgent("searchy", FLASH)
    response = gsa.chat(ask)
    print(response)


if __name__ == "__main__":
    main()
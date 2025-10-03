import asyncio
import logging
from asyncio import TaskGroup
from concurrent.futures import ThreadPoolExecutor
from pprint import pformat, pprint
from typing import Any

from google.genai import types
from kloak import Kloak
from kloak.agent import Agent
from kloak.data import KnexusGenConfig, SupportedModels
from kloak.data.history_management.history_management import HistoryManagement
from kloak.util import logger

from scrim_bot.agents.director_agent import DirectorAgent
from scrim_bot.agents.gsearch_agent import GoogleSearchAgent
from scrim_bot.agents.research_agent import ResearchAgent
from scrim_bot.agents.synthesis_agent import SynthesisAgent
from scrim_bot.babel.babel_agent import BabelDocSearchAgent
from scrim_bot.utils.enums import FLASH


class HeavyResearchAgent(Agent[str]):
    def __init__(
        self,
        kloak: Kloak,
        agent_model: SupportedModels,
        history_manager: HistoryManagement,
    ) -> None:
        """
        Initialize the HeavyResearchAgent.

        Args:
            kloak (Kloak): The Kloak instance used for subagents.
            agent_model (SupportedModels): The model to be used for the agent.
            history_manager (HistoryManagement): The history manager to be used for the
                agent.

        """
        super().__init__(
            kloak=kloak,
            agent_name="orchestrator",
            agent_model=agent_model,
            history_manager=history_manager,
        )

        # Various subagents.
        self.babel_search_agent: BabelDocSearchAgent = BabelDocSearchAgent(
            agent_name="babel_doc_search_agent"
        )
        self.google_search_agent = GoogleSearchAgent(
            agent_name="google_search_agent", agent_model=FLASH
        )
        self.director: DirectorAgent = DirectorAgent(
            kloak, agent_model, history_manager=history_manager
        )
        self.synthesis: SynthesisAgent = SynthesisAgent(
            kloak, agent_model, history_manager=history_manager
        )

        self.research_agents: list[ResearchAgent] = [
            ResearchAgent(
                self._kloak,
                "finance_researcher",
                agent_model,
                "finance",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "political_researcher",
                agent_model,
                "political",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "foci_researcher",
                agent_model,
                "foci",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "compliance_researcher",
                agent_model,
                "compliance",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "cybersecurity_researcher",
                agent_model,
                "cybersecurity",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "manufacturing_researcher",
                agent_model,
                "manufacturing",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "logistics_researcher",
                agent_model,
                "logistics",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
            ResearchAgent(
                self._kloak,
                "quality_researcher",
                agent_model,
                "quality",
                babel_doc_search_agent=self.babel_search_agent,
                google_search_agent=self.google_search_agent,
            ),
        ]

    @property
    def agent_description(self) -> str:
        return "Orchestrates the vendor vetting process."

    @property
    def prompt(self) -> str:
        return "Please provide the vendor you would like to research."

    @property
    def agents(self) -> list[Agent]:
        return [self.director, *self.research_agents, self.synthesis]

    def chat(self, prompt: str | None = None, **kwargs) -> str:
        """Synchronous sequential chat workflow for heavy research agent."""
        logger.info("Synchronous heavy research agent started...")
        # 1. Decompose the research task
        research_plan = self.director.chat(prompt)
        logger.info(f"Research plan: {pformat(research_plan)}")
        # print("Research plan:\n", str(research_plan))
        research_query = {
            "finance": research_plan.finance,
            "political": research_plan.political,
            "foci": research_plan.foci,
            "compliance": research_plan.compliance,
            "cybersecurity": research_plan.cybersecurity,
            "manufacturing": research_plan.manufacturing,
            "logistics": research_plan.logistics,
            "quality": research_plan.quality,
            # "capability": research_plan.capability,
            # "security": research_plan.security,
        }
        self._history_manager.add_history(
            [
                {
                    "role": "model",  # NOTE TO SELF: ONLY VALID ROLES ARE 'user' AND 'model'
                    "content": str(research_query),
                },
            ]
        )

        # 2. Execute research agents
        research_results = {}
        logger.info("Enacting Research Plan")
        for agent in self.research_agents:
            print(f"{agent.research_type}:")
            pprint(research_query[agent.research_type])
            agent.set_research_query(research_query[agent.research_type])
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(agent.chat, prompt="") for agent in self.research_agents
            ]
            for future, agent in zip(futures, self.research_agents, strict=False):
                research_results[agent.research_type] = future.result()
                self._history_manager.add_history(
                    [
                        {
                            "role": "model",
                            "content": f"Research Report for {agent.research_type}: {research_results[agent.research_type]}",
                        }
                    ]
                )
                logger.debug(
                    f"Research Report for {agent.research_type}: {research_results[agent.research_type]}"
                )

        # 3. Synthesize the results
        reports_to_synthesize = {key: str(val) for key, val in research_results.items()}
        final_report = self.synthesis.chat(
            prompt="", research_reports=reports_to_synthesize
        )
        self._history_manager.add_history(
            [
                {
                    "role": "model",
                    "content": f"Report for {final_report}",
                }
            ]
        )
        return final_report

    async def async_chat(self, prompt: str | None = None, **kwargs) -> str:
        """Synchronus sequential chat workflow for heavy research agent."""
        # 1. Decompose the research task
        research_plan = await self.director.async_chat(prompt)
        logger.info(f"Research plan: {pformat(research_plan)}")
        research_query = {
            "finance": research_plan.finance,
            "political": research_plan.political,
            "capability": research_plan.capability,
            "security": research_plan.security,
        }
        await self._history_manager.async_add_history(
            [
                {
                    "user": self.director.agent_name,
                    "query": str(research_query),
                },
            ]
        )

        async def researcher_generator():
            for agent in self.research_agents:
                yield agent

        # 2. Execute research in parallel
        research_results = {}
        async for agent in researcher_generator():
            agent.set_research_query(research_query[agent.research_type])
            research_results[agent.research_type] = await agent.async_chat(prompt="")
            await self._history_manager.async_add_history(
                [
                    {
                        "user": agent.agent_name,
                        "content": f"Research Report for {agent.research_type}: {research_results[agent.research_type]}",
                    }
                ]
            )
            logger.debug(
                f"Research Report for {agent.research_type}: {research_results[agent.research_type]}"
            )

        # 3. Synthesize the results
        final_report = await self.synthesis.async_chat(
            prompt="", research_reports=research_results
        )

        return final_report.research_report

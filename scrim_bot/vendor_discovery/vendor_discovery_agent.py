import asyncio
import json
from typing import List

from kloak import Kloak
from kloak.agent import Agent
from kloak.data import SupportedModels, Schema
from kloak.data.history_management import HistoryManagement
from kloak.util import logger

from scrim_bot.vendor_discovery.company_detail_agent import CompanyDetailAgent
from scrim_bot.agents.gsearch_agent import GoogleSearchAgent
from scrim_bot.prompts import VENDOR_DISCOVERY_INS
from scrim_bot.schemas import VendorShortlist, VendorDetail
from scrim_bot.utils.enums import FLASH, LITE


class VendorDiscoveryAgent(Agent[VendorShortlist]):
    def __init__(
            self,
            kloak: Kloak,
            agent_model: SupportedModels,
            history_manager: HistoryManagement,
    ):
        super().__init__(
            kloak=kloak,
            agent_name="vendor_discovery_agent",
            agent_model=agent_model,
            history_manager=history_manager,
        )
        self.google_search_agent = GoogleSearchAgent(
            agent_name="discovery_google_search_agent", agent_model=FLASH
        )

    @property
    def agent_description(self) -> str:
        return "Discovers and shortlists potential vendors for a specified material in a given location. Use this when the user wants to find *new* suppliers."

    @property
    def prompt(self) -> str:
        return VENDOR_DISCOVERY_INS

    @property
    def agents(self) -> list[Agent]:
        return [self.google_search_agent]

    @property
    def response_schema(self) -> Schema:
        return VendorShortlist.to_schema_obj()

    async def _extract_material_and_location(self, prompt: str) -> tuple[str, str]:
        """Uses an LLM call to parse material and location from the user prompt."""
        logger.info("Extracting material and location from prompt...")
        extraction_prompt = f"""
        From the following user request, extract the 'material' and the 'location'.
        Return the result as a simple JSON object with keys "material" and "location".

        User request: "{prompt}"
        """
        response = await self._kloak.async_generate_content(
            prompt=extraction_prompt, model=LITE
        )
        rtext = response.text
        rtext = rtext.replace('`', '').replace('json', '').replace('\n', '')
        rtext = json.loads(rtext)
        return rtext.get("material", ""), rtext.get("location", "")

    async def _get_company_names_from_search(
            self, material: str, location: str
    ) -> List[str]:
        """Performs broad searches and extracts potential company names."""
        logger.info("Performing broad search to find company names...")
        search_result_text = await self.google_search_agent.async_chat(
            prompt=f"Find a list of suppliers for {material} in or near {location}, try to get at least 10 potential options.",
            model=LITE
        )

        parsing_prompt = f"""
        From the following search result text, extract a list of company names that seem to be suppliers of '{material}'.
        Return a simple JSON object with a single key "company_names" which holds a list of strings.

        Search result text:
        ---
        {search_result_text}
        ---
        """
        parsed_response = await self._kloak.async_generate_content(
            prompt=parsing_prompt, model=LITE
        )

        rtext = parsed_response.text
        rtext = rtext.replace('`', '').replace('json', '').replace('\n', '')
        rtext = json.loads(rtext)
        names = rtext.get("company_names", [])
        logger.info(f"Found potential company names: {names}")
        return names[:15]  # Limit to 10 to avoid excessive parallel calls

    async def chat(self, prompt: str | None = None, **kwargs) -> VendorShortlist:
        logger.info(f"Vendor Discovery Agent starting for prompt: {prompt}")

        material, location = await self._extract_material_and_location(prompt)
        if not material or not location:
            return VendorShortlist(
                material_requested=material or "Unknown",
                target_location=location or "Unknown",
                vendors=[],
                discovery_summary="Could not determine the material and/or location from your request. Please be more specific.",
            )

        company_names = await self._get_company_names_from_search(material, location)
        if not company_names:
            return VendorShortlist(
                material_requested=material,
                target_location=location,
                vendors=[],
                discovery_summary="No potential vendors were found in the initial search. You could try rephrasing your request.",
            )

        logger.info(
            f"Starting detailed research on {len(company_names)} companies..."
        )

        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(
                    CompanyDetailAgent(
                        self._kloak, name, material, location, self._history_manager
                    ).async_chat()
                )
                for name in company_names
            ]
        vendor_details: List[VendorDetail] = [task.result() for task in tasks]
        """
        cresults = []
        for name in company_names:
            cresults.append(CompanyDetailAgent(
                self._kloak, name, material, location, self._history_manager
            ).chat()
                            )

        vendor_details = cresults
        """

        final_vendors = []
        seen_names = set()
        for vendor in vendor_details:
            if vendor['website_url'] and vendor['name'].lower() not in seen_names:
                final_vendors.append(vendor)
                seen_names.add(vendor['name'].lower())

        summary = f"Found {len(final_vendors)} potential vendors for {material} in {location} after reviewing an initial list of {len(company_names)} prospects."

        return VendorShortlist(
            material_requested=material,
            target_location=location,
            vendors=final_vendors,
            discovery_summary=summary,
        )


    async def async_chat(self, prompt: str | None = None, **kwargs) -> VendorShortlist:
        logger.info(f"Vendor Discovery Agent starting for prompt: {prompt}")

        material, location = await self._extract_material_and_location(prompt)
        if not material or not location:
            return VendorShortlist(
                material_requested=material or "Unknown",
                target_location=location or "Unknown",
                vendors=[],
                discovery_summary="Could not determine the material and/or location from your request. Please be more specific.",
            )

        company_names = await self._get_company_names_from_search(material, location)
        if not company_names:
            return VendorShortlist(
                material_requested=material,
                target_location=location,
                vendors=[],
                discovery_summary="No potential vendors were found in the initial search. You could try rephrasing your request.",
            )

        logger.info(
            f"Starting detailed research on {len(company_names)} companies..."
        )
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(
                    CompanyDetailAgent(
                        self._kloak, name, material, location, self._history_manager
                    ).async_chat()
                )
                for name in company_names
            ]

        vendor_details: List[VendorDetail] = [task.result() for task in tasks]

        final_vendors = []
        seen_names = set()
        for vendor in vendor_details:
            if vendor['website_url'] and vendor['name'].lower() not in seen_names:
                final_vendors.append(vendor)
                seen_names.add(vendor['name'].lower())

        summary = f"Found {len(final_vendors)} potential vendors for {material} in {location} after reviewing an initial list of {len(company_names)} prospects."

        return VendorShortlist(
            material_requested=material,
            target_location=location,
            vendors=final_vendors,
            discovery_summary=summary,
        )
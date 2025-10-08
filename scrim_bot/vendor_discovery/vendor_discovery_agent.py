import asyncio
import json
from typing import List, Set

from kloak import Kloak
from kloak.agent import Agent
from kloak.data import SupportedModels, Schema
from kloak.data.history_management import HistoryManagement
from kloak.util import logger

from scrim_bot.vendor_discovery.company_detail_agent import CompanyDetailAgent
from scrim_bot.agents.gsearch_agent import GoogleSearchAgent
from scrim_bot.prompts import VENDOR_DISCOVERY_INS
from scrim_bot.schemas import MaterialSchema, VendorDetail, VendorOnlyListSchema, VendorShortlist
from scrim_bot.utils.enums import FLASH, LITE
from scrim_bot.utils.firestore_util import create_discovery_request, update_discovery_request


TARGET_VENDOR_COUNT = 8  # Aim for at least this many *final* vetted vendors
MAX_INITIAL_SEARCH_RESULTS = 20  # Limit the num of raw company names extracted per search round


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
        From the following user request, extract the 'material' and the 'location' the user is interested in
        User request: {prompt}
        """
        response = await self._kloak.async_generate_content(
            prompt=extraction_prompt, model=LITE, response_schema=MaterialSchema
        )
        return response.text.get("material", ""), response.text.get("target_location", "")

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
            prompt=parsing_prompt, model=LITE, response_schema=VendorOnlyListSchema
        )
        names = parsed_response.text.get("vendors", [])
        logger.info(f"Found potential company names: {names}")
        return names[:15]  # Limit to 10 to avoid excessive parallel calls

    async def _get_company_names_from_search_round(self, material: str, location: str, search_model: SupportedModels,
                                                   query_strategy: str, num_options_target: int = 10) -> list[str]:
        """
        Performs a search round with a specific model and query strategy, generating multiple queries.
        :param material: The material that we are searching for
        :param location: The location the material is desired out
        :param search_model: Gemini model to use
        :param query_strategy: either "local_proximity" or "delivery_focus", to do different types of searches
        :param num_options_target: how many vendors to try to get
        :return: Returns a list of vendors
        """
        logger.debug(f"Performing {query_strategy} search for {material} in {location} using {search_model}.")
        search_prompts = []

        if query_strategy == "local_proximity":
            search_prompts.append(
                f"Find a list of suppliers for {material} in or near {location}, try to get at least {num_options_target} potential options. Prioritize companies with a physical presence in {location}."
            )
            search_prompts.append(
                f"List major {material} manufacturers and distributors operating primarily in {location} and surrounding areas."
            )
        elif query_strategy == "delivery_focus":
            search_prompts.append(
                f"Find companies that supply and deliver {material} to {location}, even if they are not physically located there. Aim for {num_options_target} options."
            )
            search_prompts.append(
                f"Who are the main bulk {material} suppliers that ship to {location} or serve the {location} region for large-scale projects?"
            )
            search_prompts.append(
                f"List industrial {material} distributors with strong logistics capabilities for {location} and surrounding areas."
            )
        else:
            logger.warning(f"Unknown query_strategy: {query_strategy}")
            return []

        all_search_results_text = []
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(
                    self.google_search_agent.async_chat(
                        prompt=search_prompt,
                        model=search_model
                    )
                )
                for search_prompt in search_prompts
            ]
        all_search_results_text = [task.result() for task in tasks]
        """
        for search_prompt in search_prompts:
            rtext = await self.google_search_agent.async_chat(
                prompt=search_prompt,
                model=search_model
            )
            all_search_results_text.append(rtext)
        """

        combined_search_text = "\n".join(all_search_results_text)
        parsing_prompt = f"""
                From the following search result texts, extract a list of unique company names that seem to be suppliers of '{material}'.
                Focus on identifying established companies rather than small local businesses unless explicitly mentioned as a large supplier.
                Return a simple JSON object with a single key "vendors" which holds a list of strings.

                Search result texts:
                ---
                {combined_search_text}
                ---
                """
        parsed_response = await self._kloak.async_generate_content(
            prompt=parsing_prompt,
            model=LITE, # Using LITE for parsing as it's a structured extraction task, not complex reasoning
            response_schema=VendorOnlyListSchema
        )
        names = parsed_response.text.get("vendors", [])
        logger.info(f"Found potential company names from {query_strategy} round: {names}")
        # Use a Set to handle potential duplicates introduced by multiple search prompts
        return list(set(names[:MAX_INITIAL_SEARCH_RESULTS])) # Limit for this round


    async def chat(self, prompt: str | None = None, **kwargs) -> VendorShortlist:
        logger.info(f"Vendor Discovery Agent starting for prompt: {prompt}")

        material, location = await self._extract_material_and_location(prompt)
        discovery_request_doc_ref = create_discovery_request(
            initial_prompt=prompt, material=material, location=location
        )

        if not material or not location:
            return VendorShortlist(
                material_requested=material or "Unknown",
                target_location=location or "Unknown",
                vendors=[],
                discovery_summary="Could not determine the material and/or location from your request. Please be more specific.",
            )

        # First discovery round, optimized for speed
        initial_company_names = await self._get_company_names_from_search_round(material, location, LITE,
                                                                                "local_proximity")
        all_potential_company_names = initial_company_names.copy()
        discovery_request_doc_ref = await discovery_request_doc_ref
        dis_req_id = discovery_request_doc_ref.id

        # Secondary Discovery Round (using FLASH and delivery focused search)
        if len(all_potential_company_names) < TARGET_VENDOR_COUNT:
            logger.info("Triggering secondary discovery round using flash")
            secondary_company_names = await self._get_company_names_from_search_round(material, location, FLASH,
                                                                                      "delivery_focus")
            all_potential_company_names.extend(secondary_company_names)

        if not all_potential_company_names:

            return VendorShortlist(
                material_requested=material,
                target_location=location,
                vendors=[],
                discovery_summary="No potential vendors were found in the initial search. You could try rephrasing your request.",
            )

        logger.info(
            f"Starting detailed research on {len(all_potential_company_names)} companies..."

        )

        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(
                    CompanyDetailAgent(
                        self._kloak, name, material, location, self._history_manager, dis_req_id
                    ).async_chat()
                )
                for name in all_potential_company_names

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
        final_vendor_fire_ids = []
        seen_names = set()
        for vendor in vendor_details:
            if vendor.get('website_url') and vendor['name'].lower() not in seen_names:
                final_vendors.append(vendor)
                final_vendor_fire_ids.append(vendor['vendor_firestore_id'])
                seen_names.add(vendor['name'].lower())


        summary = f"Found {len(final_vendors)} potential vendors for {material} in {location} after reviewing an initial list of {len(all_potential_company_names)} prospects."
        udr = asyncio.create_task(update_discovery_request(dis_req_id, {
            "status": "completed",
            "discovery_summary": summary,
            "final_vendor_ids": final_vendor_fire_ids,
            "num_companies": len(final_vendors)
        }))


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


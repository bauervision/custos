import asyncio
from kloak import Kloak
from kloak.agent import Agent
from kloak.data import SupportedModels, Schema
from kloak.data.history_management import HistoryManagement

from scrim_bot.agents.gsearch_agent import GoogleSearchAgent
from scrim_bot.prompts import COMPANY_DETAIL_INSTRUCTIONS
from scrim_bot.schemas import VendorDetail
from scrim_bot.utils.enums import FLASH, LITE
from scrim_bot.utils.firestore_util import get_or_create_vendor


class CompanyDetailAgent(Agent[VendorDetail]):
    def __init__(
        self,
        kloak: Kloak,
        company_name: str,
        material: str,
        location: str,
        history_manager: HistoryManagement,
        discovery_request_id: str | None = None,
    ):
        """
        Initializes a focused agent to research a single company.

        Args:
            kloak (Kloak): The Kloak instance.
            company_name (str): The name of the company to research.
            material (str): The material we are looking for.
            location (str): The target location for supply.
            history_manager (HistoryManagement): The history manager.
            discovery_request_id (str | None): The ID of the discovery request this detailing is part of.
        """
        super().__init__(
            kloak=kloak,
            agent_name=f"company_detail_agent_{company_name.replace(' ', '_').lower()}",
            agent_model=LITE,  # Use a fast model for this focused task
            history_manager=history_manager,
        )
        self.company_name = company_name
        self.material = material
        self.location = location
        self.google_search_agent = GoogleSearchAgent(
            agent_name="company_detail_gsearch", agent_model=LITE
        )
        self.discovery_request_id = discovery_request_id

    @property
    def agent_description(self) -> str:
        return f"Researches specific details for the company: {self.company_name}."

    @property
    def agents(self) -> list[Agent]:
        return [self.google_search_agent]

    @property
    def prompt(self) -> str:
        return COMPANY_DETAIL_INSTRUCTIONS.format(
            material_to_find=self.material, target_location=self.location
        )

    @property
    def response_schema(self) -> Schema:
        return VendorDetail.to_schema_obj()

    async def async_chat(self, prompt: str | None = None, **kwargs) -> VendorDetail:
        """
        Runs the detail-gathering task. The prompt to this agent is the company name.
        """
        # The main prompt is set in the property; the chat prompt is the specific query.
        company_query = (
            f"Company Name: {self.company_name}. "
            f"Find out if they supply '{self.material}' to '{self.location}'."
        )
        # Call the base Agent's async_chat to get the initial VendorDetail from LLM
        llm_vendor_detail: VendorDetail = await super().async_chat(prompt=company_query, **kwargs)

        # Now, interact with Firestore to get or create the canonical vendor document
        vendor_doc_ref = await get_or_create_vendor(
            name=llm_vendor_detail['name'],
            website_url=llm_vendor_detail['website_url'],
            primary_offering=llm_vendor_detail['primary_offering'],
            location_or_service_area=llm_vendor_detail['location_or_service_area'],
            discovered_in_request_id=self.discovery_request_id,
        )

        # Update the VendorDetail object with the Firestore document ID
        llm_vendor_detail['vendor_firestore_id'] = vendor_doc_ref.id
        return llm_vendor_detail

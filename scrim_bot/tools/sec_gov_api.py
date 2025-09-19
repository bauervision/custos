"""Tools to query US SEC APIs."""

import asyncio
import time
from typing import Any

import requests
from google.adk.tools import ToolContext


class SECDataApi:
    """Wrapper to US SEC API."""

    COMPANY_FACTS_API_URL = "https://data.sec.gov/api/xbrl/companyfacts"
    MAX_REQUESTS_PER_SECOND: int = 10

    def __init__(self) -> None:
        """Initlize SEC Api object."""
        self.api_session = requests.Session()

    def _rate_limit(self):
        """Check if rate limit has been exceeded."""

    async def get_accounts_payable(
        self,
        fiscal_year: int,
        quarter: int,
    ) -> dict[str, Any]:
        """Makes an API request to grab the accounts payable table from the SEC."""
        return {}

    async def get_company_facts(self, cik: str) -> dict[str, Any]:
        """
        Makes an API request to grab the company facts from the SEC.

        Args:
                cik (str): The Central Index Key (CIK) of the company.

        Returns:
                dict[str, Any]: The company facts.

        """
        response = self.api_session.get(f"{self.COMPANY_FACTS_API_URL}/CIK{cik}.json")
        response.raise_for_status()
        return response.json()


async def main() -> None:
    api = SECDataApi()
    res = await asyncio.gather(
        api.get_company_facts(cik="0001018724"),
    )
    print(res)


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())

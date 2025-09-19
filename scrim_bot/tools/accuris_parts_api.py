"""
Agent tools for accessing Accuris API.
"""

import os
from enum import Enum
from logging import Logger
from typing import List, Optional

import requests
from dotenv import load_dotenv
from kloak.data import KnexTool, Schema, SchemaEntry
from pydantic import BaseModel

load_dotenv()


# --- API Response Schemas ---
class Part(BaseModel):
    """Represents a part from the Accuris API."""

    partNumber: str | None = None
    partStatus: str | None = None
    description: str | None = None
    companyName: str | None = None
    cageCode: str | None = None
    documentNumber: str | None = None
    organization: str | None = None
    rohs: str | None = None
    vla: bool | None = None
    smd: bool | None = None
    plastic: bool | None = None
    dodAdopted: bool | None = None
    pinc: str | None = None
    esd: str | None = None
    msl: str | None = None
    reach: str | None = None
    temperatureGrade: str | None = None
    qualityGrade: str | None = None
    automotiveGrade: str | None = None
    datasheetUrl: str | None = None
    haystackId: str | None = None
    partId: str | None = None
    companyId: str | None = None


class PartSearchResponse(BaseModel):
    """Response schema for Accuris API part search."""

    parts: list[Part]


class PartStatus(str, Enum):
    Active = "Active"
    Discontinued = "Discontinued"
    NRFND = "NRFND"


class RohsCompliant(str, Enum):
    YES = "Yes"
    NO = "No"
    NA = "NA"


class CrossType(str, Enum):
    EXACT = "Exact"
    SIMILAR = "Similar"
    FUNCTIONAL = "Functional"


# --- Tool Definitions --
def accuris_part_search(
    partNumber: str | None = None,
    keyword: str | None = None,
    cageCode: str | None = None,
    pinc: str | None = None,
    partStatus: PartStatus | None = None,
    dodAdopted: bool | None = None,
    vla: bool | None = None,
    smd: bool | None = None,
    plastic: bool | None = None,
    rohsCompliant: RohsCompliant | None = None,
    crossType: CrossType | None = None,
    companyName: str | None = None,
    documentNumber: str | None = None,
    organization: str | None = None,
    fsc: str | None = None,
    country: str | None = None,
    page: int = 1,
    pageSize: int = 20,
    sort: str | None = None,
) -> list[Part]:
    """
    Search for parts using the Accuris API.
    Description: The objective of a part Search is to get general part and lifecycle
    information for parts that match the search criteria.

    Args:
        partNumber (str | None): The part number to search for.
        keyword (str | None): A keyword to search for in the part description.
        cageCode (str | None): The CAGE code to search for.
        pinc (str | None): The PINc to search for.
        partStatus (PartStatus | None): The part status to filter by.
        dodAdopted (bool | None): Filter for DoD adopted parts.
        vla (bool | None): Filter for VLA parts.
        smd (bool | None): Filter for SMD parts.
        plastic (bool | None): Filter for plastic parts.
        rohsCompliant (RohsCompliant | None): Filter by RoHS compliance.
        crossType (CrossType | None): The type of cross-reference search.
        companyName (str | None): The manufacturer name to search for.
        documentNumber (str | None): The document number to search for.
        organization (str | None): The organization to search for.
        fsc (str | None): The FSC to search for.
        country (str | None): The country to search for.
        page (int): The page number for pagination.
        pageSize (int): The number of results per page.
        sort (str | None): The field to sort by.

    """
    if not any([partNumber, keyword, cageCode, companyName, documentNumber]):
        raise ValueError(
            "At least one of partNumber, keyword, cageCode, companyName, or documentNumber must be provided."
        )

    url = "https://4donline.ihs.com/api/v1/parts/part"
    api_key = os.getenv("ACCURIS_API_KEY")
    if not api_key:
        raise ValueError("ACCURIS_API_KEY environment variable not set.")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    payload = {
        "partNumber": partNumber,
        "keyword": keyword,
        "cageCode": cageCode,
        "pinc": pinc,
        "partStatus": partStatus.value if partStatus else None,
        "dodAdopted": dodAdopted,
        "vla": vla,
        "smd": smd,
        "plastic": plastic,
        "rohsCompliant": rohsCompliant.value if rohsCompliant else None,
        "crossType": crossType.value if crossType else None,
        "companyName": companyName,
        "documentNumber": documentNumber,
        "organization": organization,
        "fsc": fsc,
        "country": country,
        "page": page,
        "pageSize": pageSize,
        "sort": sort,
    }
    # Filter out None values from payload
    payload = {k: v for k, v in payload.items() if v is not None}

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()  # Raise an exception for bad status codes

    response_data = response.json()
    if response_data.get("parts"):
        return PartSearchResponse.model_validate(response_data).parts
    return []


accuris_part_search_tool = KnexTool(
    name="accuris_part_search",
    description="Search for parts using the Accuris API.",
    function_schema=Schema(
        required=[],
        optional=[
            SchemaEntry(
                name="partNumber",
                attr_type=str,
                description="The part number to search for.",
            ),
            SchemaEntry(
                name="keyword",
                attr_type=str,
                description="A keyword to search for in the part description.",
            ),
            SchemaEntry(
                name="cageCode",
                attr_type=str,
                description="The CAGE code to search for.",
            ),
            SchemaEntry(
                name="pinc", attr_type=str, description="The PINc to search for."
            ),
            SchemaEntry(
                name="partStatus",
                attr_type=PartStatus,
                description="The part status to filter by.",
            ),
            SchemaEntry(
                name="dodAdopted",
                attr_type=bool,
                description="Filter for DoD adopted parts.",
            ),
            SchemaEntry(
                name="vla", attr_type=bool, description="Filter for VLA parts."
            ),
            SchemaEntry(
                name="smd", attr_type=bool, description="Filter for SMD parts."
            ),
            SchemaEntry(
                name="plastic", attr_type=bool, description="Filter for plastic parts."
            ),
            SchemaEntry(
                name="rohsCompliant",
                attr_type=RohsCompliant,
                description="Filter by RoHS compliance.",
            ),
            SchemaEntry(
                name="crossType",
                attr_type=CrossType,
                description="The type of cross-reference search.",
            ),
            SchemaEntry(
                name="companyName",
                attr_type=str,
                description="The manufacturer name to search for.",
            ),
            SchemaEntry(
                name="documentNumber",
                attr_type=str,
                description="The document number to search for.",
            ),
            SchemaEntry(
                name="organization",
                attr_type=str,
                description="The organization to search for.",
            ),
            SchemaEntry(
                name="fsc", attr_type=str, description="The FSC to search for."
            ),
            SchemaEntry(
                name="country", attr_type=str, description="The country to search for."
            ),
            SchemaEntry(
                name="page",
                attr_type=int,
                description="The page number for pagination.",
            ),
            SchemaEntry(
                name="pageSize",
                attr_type=int,
                description="The number of results per page.",
            ),
            SchemaEntry(
                name="sort", attr_type=str, description="The field to sort by."
            ),
        ],
    ),
    function=accuris_part_search,
    response_schema=Schema(
        required=[
            SchemaEntry(
                name="parts", attr_type=list[Part], description="List of parts found."
            )
        ]
    ),
)


if __name__ == "__main__":
    from pprint import pp

    # Example usage
    parts = accuris_part_search(keyword="pcb")
    pp(f"Parts found: {len(parts)}", indent=4)
    pp(parts)

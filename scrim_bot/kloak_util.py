from google.genai import types
from kloak import Kloak
from kloak.data import KnexusGenConfig

from scrim_bot.utils.enums import LITE, FLASH, PRO, GCP_PROJECT_ID

_instance = None


def get_kloak():
    global _instance
    if _instance is None:
        _instance = Kloak(
        vertex_project=GCP_PROJECT_ID,
        default_model=FLASH,
        enabled_models=[
            LITE,
            FLASH,
            PRO
        ],
        default_config=KnexusGenConfig(
            temperature=0.7,
            top_p=0.95,
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )
    return _instance

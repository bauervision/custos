from google.genai import types
from kloak import Kloak
from kloak.data import KnexusGenConfig

from scrim_bot.utils.enums import FLASH, GCP_PROJECT_ID, LITE, PRO

_instance = None
_ginstance = None


def get_kloak():
    global _instance
    if _instance is None:
        _instance = Kloak(
            vertex_project=GCP_PROJECT_ID,
            default_model=FLASH,
            enabled_models=[LITE, FLASH, PRO],
            default_config=KnexusGenConfig(
                temperature=0.7, top_p=0.95, show_thinking=True
            ),
        )
    return _instance


# An instance of Kloak with Google Search Enabled, do not use with other tools
def get_gkloak():
    global _ginstance
    if _ginstance is None:
        _ginstance = Kloak(
            vertex_project=GCP_PROJECT_ID,
            default_model=FLASH,
            enabled_models=[LITE, FLASH, PRO],
            default_config=KnexusGenConfig(tools=[types.GoogleSearch()]),
        )
    return _ginstance

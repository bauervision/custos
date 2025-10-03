from google.genai import types
from kloak import Kloak
from kloak.data import SupportedModels
from kloak.data.config import KnexusGenConfig


def main():
    kloak = Kloak(
        vertex_project="vendorvettingrit",
        default_model=SupportedModels.GEMINI_PRO_25,
        enabled_models=[
            SupportedModels.GEMINI_PRO_25,
        ],
        default_config=KnexusGenConfig(
            temperature=0.7,
            top_p=0.95,
            tools=[types.GoogleSearch()],
        ),
    )

    print("Search google for the current price of $SPY.")

    resp = kloak.generate_content(
        prompt="Search google for the current price of $SPY.",
        tools=[types.GoogleSearch()],
    )

    print(resp)


if __name__ == "__main__":
    main()

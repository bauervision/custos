from kloak import Agent

from kloak.data import KnexTool, SchemaList, Schema, SchemaEntry
from scrim_bot.babel.babel_tools import search_for_documents_and_save, save_babel_search
from scrim_bot.kloak_util import get_kloak
from scrim_bot.utils.enums import FLASH

babel_search_tool = KnexTool(
    name="babel_document_search",
    description="""Searches for a single page of documents on Babel Street. Use this for targeted queries.
    Returns a dictionary of search results. Max record_count is 100, but generally keep to 10 for LLM context.
    """,
    function=search_for_documents_and_save,
    function_schema=Schema(
        required=[],
        optional=[
            SchemaEntry(name="any_terms", attr_type=SchemaList(sub_type=str),
                        description="A list of terms where at least one must appear in the document."),
            SchemaEntry(name="all_terms", attr_type=SchemaList(sub_type=str),
                        description="A list of terms where all must appear in the document."),
            #SchemaEntry(name="record_count", attr_type=int,
            #            description="The number of documents to return (max 100, recommended 10). Defaults to 10."),
            #SchemaEntry(name="start_index", attr_type=int,
            #            description="The starting index for pagination. Defaults to 0."),
            #SchemaEntry(name="DocumentDateRangeStart", attr_type=str,
            #            description="Optional: Start date for document search (ISO 8601 format, e.g., 'YYYY-MM-DDTHH:MM:SSZ')"),
            #SchemaEntry(name="DocumentDateRangeEnd", attr_type=str,
            #            description="Optional: End date for document search (ISO 8601 format, e.g., 'YYYY-MM-DDTHH:MM:SSZ')"),
        ],
    ),
    response_schema=Schema(
        required=[
            SchemaEntry(name="Documents", attr_type=SchemaList(sub_type=dict), description="A list of found documents."),
            SchemaEntry(name="TotalDocumentCount", attr_type=int, description="The total number of documents matching the query."),
        ],
        optional=[
            SchemaEntry(name="error", attr_type=str, description="Error message if the search failed."),
            SchemaEntry(name="success", attr_type=bool, description="Indicates if the search was successful."),
        ]
    )
)


save_babel_search_tool = KnexTool(
    name="save_babel_search",
    description="""Saves the full dictionary results of a babel search to a JSON file on disk.
    Provide an appropriate, short, and safe summary title for the file name. Returns a success message.""",
    function=save_babel_search,
    function_schema=Schema(
        required=[
            SchemaEntry(name="search_results", attr_type=dict,
                        description="The full dictionary results obtained from a babel search."),
            SchemaEntry(name="output_dir", attr_type=str,
                        description="The name of the directory to save the results as (e.g., 'china_tariffs_report_2024'). Avoid special characters."),
        ]
    ),
    response_schema=Schema(
        required=[
            SchemaEntry(name="success", attr_type=bool,
                        description="True if the save operation was successful, False otherwise."),
            SchemaEntry(name="message", attr_type=str,
                        description="A message indicating the outcome of the save operation."),
        ]
    )
)



class BabelDocSearchAgent(Agent):
    def __init__(self, agent_name: str = 'babel_doc_search_agent'):
        super().__init__(
            kloak=get_kloak(),
            agent_name=agent_name,
            agent_model=FLASH
        )

    @property
    def agent_description(self) -> str:
        return """An agent specialized in searching the Babel Street API for documents
                and saving the results. It distills information into logical search terms and
                uses `search_for_documents` to query the API and store results."""

    @property
    def prompt(self) -> str:
        return """
        Your goal is to facilitate the searching of the Babel Street API for soft data documents.
        You will be called for grabbing documents with name relationships.
        You will often be provided large quantities of context; your goal is to distill this information
        into a single logical document search to perform with the `search_for_documents` tool.

        When constructing search terms:
        -   **'All' Terms:** Every term in the 'All' category must be present to successfully match documents.
            Simplify 'All' terms as much as possible. For example, if querying about "People's Republic of China",
            the 'All' term should only be 'China'. Avoid phrases like "US Health Care" in 'All' as it requires
            an exact phrase match. Only one item should be passed into the 'All' category initially, unless explicitly
            required for very narrow, precise searches.
        -   **'Any' Terms:** Use the 'Any' category for the rest of the information to be queried. At least 1
            search term must be present from the 'Any' category. Be liberal with applying terms in the 'Any' category
            to increase the odds of getting relevant info, but keep individual terms as short as possible.
            Example of bad 'Any' terms: ['china tariffs', 'sanctions on china'].
            Example of good 'Any' terms: ['tariffs', 'sanctions', 'geopolitics'].

        You will be called by a higher-level agent attempting to gather info. Work with them to figure out what
        search terms make sense, clarifying if needed, then execute a search using the `search_for_documents` tool.
        Do not grab more than 10 documents initially (set `record_count=30`).
        Once the Documents are Acquired Provide them to the User.
        However,oOnly return the documents that are relevant to the user's interests.

        If your search result doesn't return anything, explicitly mention that and provide both the 'Any' and 'All'
        terms that you used in your search.
        """

    @property
    def tools(self) -> list[KnexTool]:
        return [babel_search_tool]

import json
import unicodedata

from pathlib import Path

from kloak.util import logger
from scrim_bot.babel.api_base import BabelAPI
from typing import Optional
from scrim_bot.utils.enums import (GCP_PROJECT_ID, API_KEY_SECRET_ID, USERNAME_SECRET_ID, PASSWORD_SECRET_ID,
                                   TOKEN_SECRET_ID)


# --- API Client Initialization
api_client = BabelAPI(
    project_id=GCP_PROJECT_ID,
    api_key_secret_id=API_KEY_SECRET_ID,
    username_secret_id=USERNAME_SECRET_ID,
    password_secret_id=PASSWORD_SECRET_ID,
    token_secret_id=TOKEN_SECRET_ID
)


""" Will add support for more params later, once thats done put into the search_for_documents param info
        **doc_search_params: Other search filters like DocumentDateRangeStart,
                                 DocumentDateRangeEnd, or SentimentValueIsGreaterThan.
                                 Example: DocumentDateRangeStart="2024-01-01T00:00:00Z"
"""


def _sanitize_string_for_llm(text: str) -> str:
    """
    Sanitizes a string to replace problematic characters that might cause
    encoding issues in certain environments or display poorly, while
    attempting to preserve useful Unicode characters like CJK.
    Characters not considered "standard" printable text (e.g., arrows,
    complex symbols, control characters) will be replaced with a space.
    """
    if not isinstance(text, str):
        return text # Don't process non-string types

    cleaned_chars = []
    for char in text:
        # Keep all ASCII characters. They are generally safe.
        if ord(char) < 128:
            cleaned_chars.append(char)
        else:
            # For non-ASCII characters, be more selective.
            category = unicodedata.category(char)
            # Allow non-ASCII letters (L) and numbers (N), which includes CJK characters.
            if category[0] in ('L', 'N'):
                cleaned_chars.append(char)
            # Preserve non-ASCII spaces (like non-breaking space) as regular spaces.
            elif char.isspace():
                cleaned_chars.append(' ')
            # Replace all other non-ASCII characters (symbols, punctuation outside ASCII,
            # control characters, etc.) with a space. This will catch problematic symbols
            # like \u2190 (Sm category) that are not considered 'L' or 'N'.
            else:
                cleaned_chars.append(' ')
    return "".join(cleaned_chars).strip()


def _recursive_sanitize_dict(data):
    """
    Recursively applies _sanitize_string_for_llm to all string values
    within dictionaries and lists.
    """
    if isinstance(data, dict):
        return {k: _recursive_sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_recursive_sanitize_dict(elem) for elem in data]
    elif isinstance(data, str):
        return _sanitize_string_for_llm(data)
    else:
        return data


def save_babel_search(search_results: dict, output_dir: str = "babel_results") -> dict:
    """
    Takes in the full return from a babel search and saves it to disk.
    This version returns a dictionary indicating success or failure.

    :param search_results: The full dict results of a babel search
    :param output_dir: output_name: The name of the file to save the results as, be sure to avoid using special chars
    :return: A dict with 'success' status and a message
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    docs = search_results['Documents']
    try:
        for doc in docs:
            sanitized_docpath = "".join(c for c in doc['DocumentName'] if c.isalnum() or c == '_').rstrip()
            if len(sanitized_docpath) > 50:
                sanitized_docpath = sanitized_docpath[0:50]
            full_path = Path(f"{output_dir}/{sanitized_docpath}.json")
            with open(full_path, 'w') as f:
                json.dump(doc, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save babel results: {e}")
        return {"success": False, "message": f"Failed to save results: {e}"}
    logger.info(f"Babel search results saved to {output_dir}")
    return {"success": True, "message": f"Results saved to {output_dir}"}


def search_for_documents(
    any_terms: Optional[list[str]] = None,  # Specifying that None is optional is not optional
    all_terms: Optional[list[str]] = None,
    record_count: int = 10,
    start_index: int = 0,
    **doc_search_params,
) -> dict:
    """
    Searches for a single page of documents on Babel Street. Use this for targeted queries
    or when you need to inspect the first few results. To get all results, use
    search_for_all_documents instead.

    Args:
        any_terms (list[str, optional): A list of terms where at least one must appear in the document.
        all_terms (list[str], optional): A list of terms where all must appear in the document.
        record_count (int, optional): The number of documents to return on the page. Max is 100. Defaults to 10.
            Generally a bad idea to go above 10 due to google llm context limitations
        start_index (int, optional): The starting index for pagination. Defaults to 0. Use higher nums when paginating
            ex: Grabbing 200 documents with record count set to 100, page 0 has first hundred docs, page 1 has next 100

    Returns:
        dict: A dictionary of the search results, including a list of documents and the total count.
              Returns an error dictionary if an exception occurs.
    """
    logger.debug(f"Performing Babel Search with any_terms: {any_terms} and all_terms: {all_terms}")
    try:
        results = api_client.search(
            any_terms=any_terms,
            all_terms=all_terms,
            record_count=record_count,
            start_index=start_index,
            **doc_search_params
        )
        cleaned_results = _recursive_sanitize_dict(results)
        return cleaned_results
    except Exception as e:
        # Return a structured error, useful for the agent to parse
        return {"error": f"An error occurred during search: {e}", "success": False}



def search_for_documents_and_save(
    any_terms: Optional[list[str]] = None,  # Specifying that None is optional is not optional
    all_terms: Optional[list[str]] = None,
    record_count: int = 10,
    start_index: int = 0,
    **doc_search_params,
) -> dict:
    """
    Searches for a single page of documents on Babel Street. Use this for targeted queries
    or when you need to inspect the first few results. To get all results, use
    search_for_all_documents instead.

    Args:
        any_terms (list[str, optional): A list of terms where at least one must appear in the document.
        all_terms (list[str], optional): A list of terms where all must appear in the document.
        record_count (int, optional): The number of documents to return on the page. Max is 100. Defaults to 10.
            Generally a bad idea to go above 10 due to google llm context limitations
        start_index (int, optional): The starting index for pagination. Defaults to 0. Use higher nums when paginating
            ex: Grabbing 200 documents with record count set to 100, page 0 has first hundred docs, page 1 has next 100

    Returns:
        dict: A dictionary of the search results, including a list of documents and the total count.
              Returns an error dictionary if an exception occurs.
    """
    results = search_for_documents(any_terms, all_terms, record_count, start_index, **doc_search_params)
    output_dir = "babel_results/" + "_".join(all_terms) + "_" + "_".join(any_terms)
    if len(output_dir) > 50:
        output_dir = output_dir[0:50]
    try:
        save_babel_search(results, output_dir)
    except Exception as e:
        logger.warning(f"Unable to save babel search results: exception {e}")
    return results


def main():
    docs = search_for_documents(
        all_terms=["apple", "tariffs"]
    )
    print(docs)


if __name__ == "__main__":
    main()

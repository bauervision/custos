import json
import os
import requests
from google.cloud import secretmanager
from scrim_bot.utils.singleton import Singleton
from scrim_bot.utils.enums import GCP_PROJECT_ID, API_KEY_SECRET_ID, USERNAME_SECRET_ID, PASSWORD_SECRET_ID, TOKEN_SECRET_ID


class BabelAPI(metaclass=Singleton):
    """
    A client for interacting with the Babel Street API, with support for GCP Secret Manager
    for credential storage and automatic token handling.
    """
    AUTH_URL = "https://authentication.babelstreet.com/v1/identity/token"
    SEARCH_URL = "https://documents.babelstreet.com/v1/search"

    def __init__(self, project_id: str, api_key_secret_id: str, username_secret_id: str, password_secret_id: str,
                 token_secret_id: str):
        self.project_id = project_id
        self.secret_client = secretmanager.SecretManagerServiceClient()

        # Secret IDs
        self.api_key_secret_id = api_key_secret_id
        self.username_secret_id = username_secret_id
        self.password_secret_id = password_secret_id
        self.token_secret_id = token_secret_id

        # Load static credentials from GCP
        print("Loading static credentials from GCP Secret Manager...")
        self._api_key = self._get_gcp_secret(self.api_key_secret_id)
        self._username = self._get_gcp_secret(self.username_secret_id)
        self._password = self._get_gcp_secret(self.password_secret_id)

        # Load tokens from GCP
        self._access_token = None
        self._refresh_token = None
        self._load_tokens_from_gcp()
        print("Tokens loaded.")

    def _get_gcp_secret(self, secret_id: str, version_id: str = "latest") -> str:
        """Retrieves a secret from Google Cloud Secret Manager."""
        name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version_id}"
        try:
            response = self.secret_client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as e:
            print(f"Failed to access secret {secret_id}. It might not exist yet. This is normal on first run.")
            raise

    def _save_tokens_to_gcp(self, token_info: dict):
        """Saves new tokens by creating a new version in GCP Secret Manager."""
        self._access_token = token_info.get("access_token")
        self._refresh_token = token_info.get("refresh_token")

        parent = f"projects/{self.project_id}/secrets/{self.token_secret_id}"
        payload = json.dumps(token_info).encode("UTF-8")

        try:
            self.secret_client.add_secret_version(
                request={"parent": parent, "payload": {"data": payload}}
            )
            print("Successfully saved new tokens to GCP Secret Manager.")
        except Exception as e:
            print(f"Failed to save tokens to GCP Secret Manager: {e}")
            # Non-fatal, as we have the token in memory for this session
            pass

    def _load_tokens_from_gcp(self):
        """Loads access and refresh tokens from GCP Secret Manager."""
        try:
            print("Loading tokens from GCP Secret Manager...")
            token_json = self._get_gcp_secret(self.token_secret_id)
            token_info = json.loads(token_json)
            self._access_token = token_info.get('access_token')
            self._refresh_token = token_info.get('refresh_token')
        except Exception as e:
            print(e)
            print("Could not load tokens from GCP. Will fetch new ones.")
            self._access_token = None
            self._refresh_token = None

    def _fetch_and_save_new_token(self, use_refresh_token: bool = False):
        """Fetches a new token and saves it to GCP."""
        payload = {}
        # print(f'using refresh token {self._refresh_token}')
        if use_refresh_token and self._refresh_token:
            print("Requesting new token using refresh token...")
            payload = {  # I feel like user and pass shouldn't be needed, but it seems like they are
                "username": self._username,
                "password": self._password,
                "refresh_token": self._refresh_token
            }
        else:
            print("Requesting new token using username and password...")
            payload = {"username": self._username, "password": self._password}

        headers = {"x-api-key": self._api_key}
        response = requests.post(self.AUTH_URL, json=payload, headers=headers)
        if response.status_code == 500:
            raise RuntimeError(f"Failed to get token: Response [500]")

        response_data = response.json()
        if response.status_code != 200 or response_data.get('message', '').lower() == 'forbidden' or \
          response_data.get('message') == 'unauthorized':
            raise RuntimeError(f"Failed to get token: {response_data}")

        self._save_tokens_to_gcp(response_data)

    def _api_request(self, method: str, url: str, **kwargs) -> dict:
        """Makes an authenticated request to the API, handling token refresh."""
        if not self._access_token:
            self._fetch_and_save_new_token(use_refresh_token=bool(self._refresh_token))

        headers = kwargs.pop("headers", {})
        headers.update({
            "token": self._access_token,
            "x-api-key": self._api_key,
        })

        response = requests.request(method, url, headers=headers, **kwargs)

        # Check for expired token (401 Unauthorized is a common indicator)
        if response.status_code == 401:
            print("Token may be expired. Refreshing and retrying...")
            try:
                self._fetch_and_save_new_token(use_refresh_token=True)
            except RuntimeError:
                print("Refresh token failed. Falling back to credentials.")
                self._fetch_and_save_new_token(use_refresh_token=False)

            # Retry request with the new token
            headers["token"] = self._access_token
            response = requests.request(method, url, headers=headers, **kwargs)

        response.raise_for_status()
        return response.json()

    def search(self, any_terms: list = None, all_terms: list = None, record_count: int = 10, start_index: int = 0,
               **doc_search_params):
        """
        Performs a search for a single page of results.
        Additional search parameters can be passed as keyword arguments.
        """
        search_terms = {}
        if any_terms:
            search_terms['Any'] = any_terms
        if all_terms:
            search_terms['All'] = all_terms

        params = {
            "SearchTerms": search_terms,
            # TODO: Add smarter attributes system
            "AttributeTypeIds": [439],  # 439 Is the Babel Curated Topics Attribute
            **doc_search_params
        }

        payload = {
            "StartIndex": start_index,
            "RecordCount": record_count,
            "DocumentSearchParams": params
        }

        return self._api_request("post", self.SEARCH_URL, json=payload)

    def search_all(self, any_terms: list = None, all_terms: list = None, **doc_search_params):
        """
        Performs a search and automatically handles pagination to retrieve all matching documents.
        """
        all_documents = []
        start_index = 0
        page_size = 100  # Max records per page for efficient fetching

        print("Starting paginated search to retrieve all documents...")
        while True:
            try:
                page_results = self.search(
                    any_terms=any_terms,
                    all_terms=all_terms,
                    record_count=page_size,
                    start_index=start_index,
                    **doc_search_params
                )

                if not page_results or not page_results.get('Documents'):
                    print("No more documents found.")
                    break

                documents_on_page = page_results['Documents']
                all_documents.extend(documents_on_page)

                total_docs_found = page_results.get('TotalDocumentCount', 0)
                print(
                    f"Retrieved {len(documents_on_page)} documents. Total so far: {len(all_documents)} of {total_docs_found}")

                start_index += len(documents_on_page)

                if start_index >= total_docs_found or len(documents_on_page) < page_size:
                    print("All documents have been retrieved.")
                break

            except requests.exceptions.HTTPError as e:
                print(f"An HTTP error occurred during pagination: {e}")
                break

        return {
            'Documents': all_documents,
            'TotalDocumentCount': len(all_documents)
        }


def main():
    # --- Configuration ---


    try:
        # Initialize the API client
        api = BabelAPI(
            project_id=GCP_PROJECT_ID,
            api_key_secret_id=API_KEY_SECRET_ID,
            username_secret_id=USERNAME_SECRET_ID,
            password_secret_id=PASSWORD_SECRET_ID,
            token_secret_id=TOKEN_SECRET_ID
        )
    except Exception as e:
        print(
            f"Failed to initialize BabelAPI client. Please check your GCP configuration and authentication. Error: {e}")
        return

    # --- Define Search Parameters ---
    #any_terms = ["aapl", "apple"]
    #all_terms = ["tariff"]
    any_terms = ['tariffs', 'sanctions', 'geopolitics']
    all_terms = ['indonesia']
    #all_terms = ["apple", "government"]
    search_params = {
        "DocumentDateRangeStart": "2025-04-01T00:00:00Z",
        "DocumentDateRangeEnd": "2025-12-03T23:59:59Z",
    }

    # --- Perform Search ---
    # Example 1: Paginated search to get all results
    print("\n--- Performing paginated search for all results ---")
    try:
        #all_search_results = api.search_all(
        #    any_terms=any_terms,
        #    all_terms=all_terms,
        #    **search_params
        #)
        search_results = api.search(
            any_terms=any_terms,
            all_terms=all_terms,
            **search_params
        )
        doc_count = search_results['TotalDocumentCount']
        print(f"Finished paginated search. Found and retrieved {doc_count} documents.")
        #save_results(search_results, 'capple')
        print('Done Saving Results')
    except requests.exceptions.HTTPError as e:
        print(f"Search failed: {e.response.text}")
    #except Exception as e:
    #    print(f"An unexpected error occurred: {e}")
    print('Done')


if __name__ == "__main__":
    main()

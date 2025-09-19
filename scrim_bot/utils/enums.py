from kloak.data.supported_models import SupportedModels

GCP_PROJECT_ID = "vendorvettingrit"

# LLM Models To Use
LITE = SupportedModels.GEMINI_FLASH_25_LITE
FLASH = SupportedModels.GEMINI_FLASH_25
PRO = SupportedModels.GEMINI_PRO_25

# 10k Stuff
TEN_K_STATE = "ten_k_data"
TEN_K_FILEPATH = "ten_k_file_path"

# Babel API Secret Names
API_KEY_SECRET_ID = "babel-api-key"
USERNAME_SECRET_ID = "babel-api-username"
PASSWORD_SECRET_ID = "babel-api-password"
TOKEN_SECRET_ID = "babel-api-tokens"

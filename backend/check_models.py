import os
import requests
from dotenv import load_dotenv

# Load the API key from your .env file
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

print("Contacting Google API to check authorized models...")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
response = requests.get(url)

if response.status_code == 200:
    models = response.json().get('models', [])
    print("\n--- AUTHORIZED MODELS FOR GENERATE CONTENT ---")
    for m in models:
        # We only care about models that support text generation
        if 'generateContent' in m.get('supportedGenerationMethods', []):
            print(m['name'])
    print("----------------------------------------------")
else:
    print("Failed to fetch models:")
    print(response.json())
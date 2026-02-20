import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("No GOOGLE_API_KEY found in .env")
    exit(1)

genai.configure(api_key=api_key)

print(f"API Key found: {api_key[:5]}...{api_key[-3:]}")
print("🔍 Listing available models...")

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")

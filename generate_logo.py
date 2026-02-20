import requests
import base64
import os

url = 'https://logiwa.com.tr/wp-content/uploads/2018/11/logo-web-site-300x138.png'
r = requests.get(url)
b64 = base64.b64encode(r.content).decode('utf-8')
js_content = f'export const LOGIWA_LOGO_BASE64 = "data:image/png;base64,{b64}";'

target_dir = r'C:\Users\CihanHartamaci\.gemini\antigravity\scratch\logiwa_intelligence\dashboard\src'
os.makedirs(target_dir, exist_ok=True)
with open(os.path.join(target_dir, 'logo_base64.js'), 'w') as f:
    f.write(js_content)

print("Logo Base64 generated successfully.")

import gspread
from google.oauth2.service_account import Credentials
import requests
import datetime

# ===================== CONFIG =====================
SHEET_ID = "YOUR_SHEET_ID"
SHEET_NAME = "Sheet1"
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"
PINTEREST_ACCESS_TOKEN = "YOUR_PINTEREST_ACCESS_TOKEN"

# Google Sheets Auth
creds = Credentials.from_service_account_file("credentials.json", scopes=["https://www.googleapis.com/auth/spreadsheets"])
client = gspread.authorize(creds)
sheet = client.open_by_key(SHEET_ID).worksheet(SHEET_NAME)

# ===================== STEP 1: Fetch Pending Rows =====================
rows = sheet.get_all_records()
pending = [r for r in rows if r["status"] == "pending"][:2]

if not pending:
    print("No pending rows found.")
    exit()

for row in pending:
    row_number = rows.index(row) + 2  # +2 for header + 1-based index

    image_prompt = row["image_prompt"]
    affiliate_link = row["affiliate_link"]
    board_id = row["board_id"]

    # ===================== STEP 2: Generate Image (Gemini API) =====================
    print(f"Generating image for: {image_prompt}")
    gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateImage"
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}"}
    payload = {"prompt": image_prompt}

    response = requests.post(gemini_url, headers=headers, json=payload)

    if response.status_code != 200:
        print("Gemini error:", response.text)
        continue

    image_url = response.json().get("image_url")
    if not image_url:
        print("No image generated")
        continue

    # ===================== STEP 3: Post to Pinterest =====================
    print(f"Posting to Pinterest board: {board_id}")
    pinterest_url = "https://api.pinterest.com/v5/pins"
    headers = {"Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}"}
    data = {
        "board_id": board_id,
        "title": image_prompt[:50],
        "description": f"{image_prompt}\n#fashion #style #menswear",
        "link": affiliate_link,
        "media_source": {"source_type": "image_url", "url": image_url},
    }

    pin_response = requests.post(pinterest_url, headers=headers, json=data)

    if pin_response.status_code != 201:
        print("Pinterest error:", pin_response.text)
        continue

    # ===================== STEP 4: Update Google Sheet =====================
    sheet.update_cell(row_number, list(row.keys()).index("status") + 1, "posted")
    sheet.update_cell(row_number, list(row.keys()).index("posted_at") + 1, str(datetime.datetime.now()))
    sheet.update_cell(row_number, list(row.keys()).index("image_url") + 1, image_url)

    print("✅ Posted & updated row:", row_number)
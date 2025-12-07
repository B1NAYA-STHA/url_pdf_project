from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os, uuid, base64, json, uvicorn

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# JSON file storage for history
HISTORY_FILE = "history.json"

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_history():
    with open(HISTORY_FILE, "w") as f:
        json.dump(search_history_store, f)

search_history_store = load_history()

# Request model for PDF generation
class PDFRequest(BaseModel):
    url: str
    user_id: str


@app.post("/generate-pdf")
def generate_pdf(request: PDFRequest):
    url = request.url
    user_id = request.user_id

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Store history
    history = search_history_store.get(user_id, [])
    history = [url] + [u for u in history if u != url]
    search_history_store[user_id] = history[:8]
    save_history()

    # Ensure folder exists
    os.makedirs("generated_pdfs", exist_ok=True)
    filename = f"{uuid.uuid4()}.pdf"
    output_path = os.path.join("generated_pdfs", filename)

    try:
        # Headless Chrome config
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")

        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=chrome_options
        )
        driver.get(url)

        pdf_data = driver.execute_cdp_cmd(
            "Page.printToPDF",
            {"printBackground": True, "format": "A4"}
        )
        driver.quit()

        with open(output_path, "wb") as f:
            f.write(base64.b64decode(pdf_data['data']))

        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename="webpage.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to fetch search history for a user
@app.get("/history")
def get_history(user_id: str = Query(...)):
    return search_history_store.get(user_id, [])

# Function to run FastAPI with uvicorn (used in Poetry script)
def start():
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)


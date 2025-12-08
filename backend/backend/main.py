from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os, uuid, base64, json, uvicorn

app = FastAPI()

# CORS for
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HISTORY_FILE = "history.json"
GENERATED_DIR = "generated_pdfs"

os.makedirs(GENERATED_DIR, exist_ok=True)

# Load history
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
        json.dump(search_history_store, f, indent=4)

search_history_store = load_history()

# Request model
class PDFRequest(BaseModel):
    url: str
    user_id: str = None
    
@app.post("/generate-pdf")
async def generate_pdf(request_data: PDFRequest):
    url = request_data.url
    user_id = request_data.user_id

    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    # Generate new user_id if first request
    if not user_id:
        user_id = str(uuid.uuid4())

    # Update history
    history = search_history_store.get(user_id, [])
    history = [url] + [u for u in history if u != url]
    search_history_store[user_id] = history[:8]
    save_history()

    # Generate PDF
    filename = f"{uuid.uuid4()}.pdf"
    output_path = os.path.join(GENERATED_DIR, filename)

    try:
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
            "Page.printToPDF", {"printBackground": True, "format": "A4"}
        )
        driver.quit()

        with open(output_path, "wb") as f:
            f.write(base64.b64decode(pdf_data["data"]))

        # Return JSON with user_id + file name
        return {"user_id": user_id, "file": filename}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history")
async def get_history(user_id: str):
    return search_history_store.get(user_id, [])


@app.get("/download/{file_name}")
async def download_file(file_name: str):
    file_path = os.path.join(GENERATED_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found")
    return FileResponse(file_path, media_type="application/pdf", filename="webpage.pdf")

# Run FastAPI with uvicorn
def start():
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

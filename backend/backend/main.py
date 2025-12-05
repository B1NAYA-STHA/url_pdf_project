from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os
import uuid
import base64
import uvicorn

app = FastAPI()

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model for URL input
class PDFRequest(BaseModel):
    url: str

@app.post("/generate-pdf")
def generate_pdf(request: PDFRequest):
    url = request.url
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    os.makedirs("generated_pdfs", exist_ok=True)  # Ensure folder exists
    filename = f"{uuid.uuid4()}.pdf"
    output_path = os.path.join("generated_pdfs", filename)

    try:
        # Configure headless Chrome
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")

        # Launch Chrome and navigate to URL
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()),
            options=chrome_options
        )
        driver.get(url)

        # Generate PDF using Chrome DevTools Protocol
        pdf_data = driver.execute_cdp_cmd("Page.printToPDF", {
            "printBackground": True,
            "format": "A4"
        })
        driver.quit()

        # Save PDF to file
        with open(output_path, "wb") as f:
            f.write(base64.b64decode(pdf_data['data']))

        # Return PDF as response
        return FileResponse(
            output_path,
            media_type="application/pdf",
            filename="webpage.pdf"
        )

    except Exception as e:
        return HTTPException(status_code=500, detail=str(e))

# Function to run FastAPI with uvicorn (used in Poetry script)
def start():
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

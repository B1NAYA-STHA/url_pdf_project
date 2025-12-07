import os
import base64
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_generate_pdf_success(tmp_path):
    # Mock Selenium WebDriver
    mock_driver = MagicMock()
    mock_driver.execute_cdp_cmd.return_value = {
        "data": base64.b64encode(b"%PDF-1.4 mock pdf data").decode("utf-8")
    }

    # Mock ChromeDriverManager and WebDriver creation
    with patch("backend.main.ChromeDriverManager") as mock_manager:
        mock_manager().install.return_value = "/fake/path"

        with patch("backend.main.webdriver.Chrome", return_value=mock_driver):
            # Send test request
            response = client.post("/generate-pdf", json={"url": "https://example.com"})

            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert response.content.startswith(b"%PDF")


def test_generate_pdf_invalid_url():
    response = client.post("/generate-pdf", json={"url": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "URL is required"

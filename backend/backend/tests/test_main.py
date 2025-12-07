# tests/test_main.py
import os
import base64
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app, search_history_store

client = TestClient(app)

USER_ID = "test_user"

def test_generate_pdf_success(tmp_path):
    # Clear history before test
    search_history_store.clear()

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
            response = client.post(
                "/generate-pdf",
                json={"url": "https://example.com", "user_id": USER_ID}
            )

            # Assert PDF response
            assert response.status_code == 200
            assert response.headers["content-type"] == "application/pdf"
            assert response.content.startswith(b"%PDF")

            # Assert search history updated
            assert USER_ID in search_history_store
            assert search_history_store[USER_ID] == ["https://example.com"]

def test_generate_pdf_invalid_url():
    response = client.post("/generate-pdf", json={"url": "", "user_id": USER_ID})
    assert response.status_code == 400
    assert response.json()["detail"] == "URL is required"

def test_search_history_multiple_entries():
    # Clear history before test
    search_history_store.clear()

    urls = ["https://a.com", "https://b.com", "https://a.com"] 

    # Mock WebDriver for all requests
    mock_driver = MagicMock()
    mock_driver.execute_cdp_cmd.return_value = {
        "data": base64.b64encode(b"%PDF-1.4 mock pdf data").decode("utf-8")
    }
    with patch("backend.main.ChromeDriverManager") as mock_manager:
        mock_manager().install.return_value = "/fake/path"
        with patch("backend.main.webdriver.Chrome", return_value=mock_driver):
            for url in urls:
                client.post("/generate-pdf", json={"url": url, "user_id": USER_ID})

    # Check that duplicates are removed and latest order is preserved
    history = client.get(f"/history?user_id={USER_ID}").json()
    assert history == ["https://a.com", "https://b.com"]  # latest first, no duplicate

def test_history_empty_for_new_user():
    search_history_store.clear()
    response = client.get("/history?user_id=new_user")
    assert response.status_code == 200
    assert response.json() == []

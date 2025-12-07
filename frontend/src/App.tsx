import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

function App() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const userId = "user123"; // simple user identifier 

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setPdfUrl(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, user_id: userId }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF.");

      const blob = await res.blob();
      const fileURL = window.URL.createObjectURL(blob);
      setPdfUrl(fileURL);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://localhost:8000/history?user_id=${userId}`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const setUrlFromHistory = (item: string) => setUrl(item);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Website PDF Generator</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter website URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 border rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg"
          >
            {loading ? "Generating PDF..." : "Generate PDF"}
          </button>
        </form>

        {error && <p className="text-red-600 mt-3 text-center">{error}</p>}

        {pdfUrl && (
          <div className="mt-5 text-center">
            <a href={pdfUrl} download="webpage.pdf" className="bg-green-600 text-white px-5 py-2 rounded-lg">
              Download PDF
            </a>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={fetchHistory}
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Show History
          </button>

          {history.length > 0 && (
            <ul className="mt-3 space-y-2">
              {history.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between p-2 border rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => setUrlFromHistory(item)}
                >
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

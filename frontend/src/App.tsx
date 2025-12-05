import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

function App() {
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setPdfBlobUrl(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF.");

      const blob = await res.blob();
      const fileURL = window.URL.createObjectURL(blob);
      setPdfBlobUrl(fileURL);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Website PDF Generator
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter website URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {loading ? "Generating PDF..." : "Generate PDF"}
          </button>
        </form>

        {error && <p className="text-red-600 mt-3 text-center">{error}</p>}

        {pdfBlobUrl && (
          <div className="mt-5 text-center">
            <a
              href={pdfBlobUrl}
              download="webpage.pdf"
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

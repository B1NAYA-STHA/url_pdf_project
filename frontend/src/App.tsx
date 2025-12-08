import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const storedId = localStorage.getItem("user_id");
  const [userId, setUserId] = useState<string | null>(storedId);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPdfUrl(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, user_id: userId }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const data = await res.json();

      // Store userId if newly generated
      if (!userId) {
        setUserId(data.user_id);
        localStorage.setItem("user_id", data.user_id);
      }

      setPdfUrl(`http://127.0.0.1:8000/download/${data.file}`);
      fetchHistory(data.user_id || userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (id: string | null) => {
    if (!id) return;
    const res = await fetch(`http://127.0.0.1:8000/history?user_id=${id}`);
    const data = await res.json();
    setHistory(data);
  };

  useEffect(() => {
    if (userId) fetchHistory(userId);
  }, [userId]);

  return (
    <div className="min-h-screen flex justify-center items-center p-6 bg-gray-100">
      <div className="bg-white shadow-xl p-8 rounded-xl max-w-lg w-full">
        <h1 className="text-2xl font-bold text-center mb-4">
          Website PDF Generator
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Enter website URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="border p-3 rounded w-full"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white w-full py-3 rounded-lg"
          >
            {loading ? "Generating..." : "Generate PDF"}
          </button>
        </form>

        {error && <p className="text-red-600 text-center mt-3">{error}</p>}

        {pdfUrl && (
          <div className="mt-4 text-center">
            <a
              href={pdfUrl}
              target="_blank"
              className="bg-green-600 text-white px-5 py-2 rounded-lg"
            >
              Download PDF
            </a>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={() => fetchHistory(userId)}
            className="bg-gray-700 text-white w-full py-2 rounded-lg"
          >
            Show History
          </button>

          {history.length > 0 && (
            <ul className="mt-3 space-y-2">
              {history.map((item, i) => (
                <li
                  key={i}
                  className="cursor-pointer underline text-blue-600"
                  onClick={() => setUrl(item)}
                >
                  {item}
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

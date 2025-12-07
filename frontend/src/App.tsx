import type { FormEvent } from "react";
import { useState } from "react";
import "./App.css";

function App() {
	//Generate a unique user_id stored in localStorage so history persists even after server restart
	const storedId = localStorage.getItem("user_id");
	const [userId] = useState<string>(() => {
		if (storedId) return storedId;

		// Create new unique ID for new user 
		const newId = crypto.randomUUID();
		localStorage.setItem("user_id", newId);
		return newId;
	});

	const [url, setUrl] = useState("");
	const [loading, setLoading] = useState(false);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<string[]>([]);

	//Handle PDF generation request
	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setPdfUrl(null);

		try {
			//Send URL + user ID to backend and saves URL in history
			const res = await fetch("http://127.0.0.1:8000/generate-pdf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url, user_id: userId }),
			});
			if (!res.ok) throw new Error("Failed to generate PDF.");

			//Convert backend PDF blob into downloadable file
			const blob = await res.blob();
			setPdfUrl(URL.createObjectURL(blob));

			await fetchHistory();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error occurred");
		} finally {
			setLoading(false);
		}
	};

	//Fetch user's unique history from backend
	const fetchHistory = async () => {
		const res = await fetch(
			`http://127.0.0.1:8000/history?user_id=${userId}`,
		);
		const data = await res.json();
		setHistory(data);
	};

	return (
		<div className="min-h-screen flex flex-col items-center justify-center p-6">
			<div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-lg">
				<h1 className="text-2xl font-bold mb-4 text-center">
					Website PDF Generator
				</h1>

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
						<a
							href={pdfUrl}
							download="webpage.pdf"
							className="bg-green-600 text-white px-5 py-2 rounded-lg"
						>
							Download PDF
						</a>
					</div>
				)}

				<div className="mt-6">
					<button
						type="button"
						onClick={fetchHistory}
						className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
					>
						Show History
					</button>

					{history.length > 0 && (
						<ul className="mt-3 space-y-2">
							{history.map((item) => (
								<li
									key={item}
									onClick={() => setUrl(item)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ")
											setUrl(item);
									}}
									tabIndex={0}
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

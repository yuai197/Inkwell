"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError("");
    setReadme("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setReadme(data.readme);
      }
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-16 max-w-3xl mx-auto w-full">
      {/* Header */}
      <h1 className="text-4xl font-bold tracking-tight mb-2">README AI</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
        Paste a GitHub repo URL, get a professional README in seconds.
      </p>

      {/* Input */}
      <div className="w-full flex gap-3 mb-6">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="https://github.com/owner/repo"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          onClick={generate}
          disabled={loading || !url.trim()}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="w-full p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="w-full p-6 rounded-xl border border-gray-200 dark:border-gray-800 animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
        </div>
      )}

      {/* Result */}
      {readme && (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Generated README.md</span>
            <button
              onClick={handleCopy}
              className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="w-full p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
            {readme}
          </pre>
        </div>
      )}

      {/* Empty state */}
      {!readme && !loading && !error && (
        <div className="w-full p-12 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center text-gray-400">
          <svg className="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Your generated README will appear here</p>
        </div>
      )}
    </main>
  );
}

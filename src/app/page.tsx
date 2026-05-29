"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";

function getUsage(): { date: string; count: number } {
  if (typeof window === "undefined") return { date: "", count: 0 };
  try {
    const raw = localStorage.getItem("inkwell_usage");
    if (!raw) return { date: "", count: 0 };
    return JSON.parse(raw);
  } catch {
    return { date: "", count: 0 };
  }
}

function bumpUsage() {
  const today = new Date().toDateString();
  const usage = getUsage();
  if (usage.date !== today) {
    localStorage.setItem("inkwell_usage", JSON.stringify({ date: today, count: 1 }));
    return 1;
  }
  const next = usage.count + 1;
  localStorage.setItem("inkwell_usage", JSON.stringify({ date: today, count: next }));
  return next;
}

const FREE_LIMIT = 3;

export default function Home() {
  const [url, setUrl] = useState("");
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(true);
  const [remaining, setRemaining] = useState(() => {
    const u = getUsage();
    const today = new Date().toDateString();
    return u.date === today ? Math.max(0, FREE_LIMIT - u.count) : FREE_LIMIT;
  });

  async function generate() {
    if (remaining <= 0) {
      setError(`You've used all ${FREE_LIMIT} free generations today. Come back tomorrow!`);
      return;
    }

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
        const used = bumpUsage();
        setRemaining(Math.max(0, FREE_LIMIT - used));
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
      <h1 className="text-4xl font-bold tracking-tight mb-2">Inkwell</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
        Dip into the inkwell. Paste a GitHub link, let AI craft your story.
      </p>
      <p className="text-xs text-gray-400 mb-6">
        {remaining} free generation{remaining !== 1 ? "s" : ""} left today
      </p>

      {/* Input */}
      <div className="w-full flex gap-3 mb-6">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="https://github.com/owner/repo — dip it in"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          onClick={generate}
          disabled={loading || !url.trim() || remaining <= 0}
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

      {/* Loading */}
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
            <span className="text-sm text-gray-500">Fresh from the inkwell</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreview(!preview)}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {preview ? "Raw" : "Preview"}
              </button>
              <button
                onClick={handleCopy}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {preview ? (
            <div className="w-full p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm leading-relaxed max-w-none markdown-body">
              <ReactMarkdown>{readme}</ReactMarkdown>
            </div>
          ) : (
            <pre className="w-full p-6 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono">
              {readme}
            </pre>
          )}
        </div>
      )}

      {/* Empty state */}
      {!readme && !loading && !error && (
        <div className="w-full p-12 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center text-gray-400">
          <svg className="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Your README will flow out here</p>
        </div>
      )}
    </main>
  );
}

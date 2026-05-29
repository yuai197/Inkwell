"use client";

import { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";

// --- localStorage helpers ---

type HistoryEntry = { url: string; readme: string; time: number };

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("inkwell_history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem("inkwell_history", JSON.stringify(entries.slice(0, 10)));
}

function getUsage(): { date: string; count: number } {
  if (typeof window === "undefined") return { date: "", count: 0 };
  try {
    const raw = localStorage.getItem("inkwell_usage");
    return raw ? JSON.parse(raw) : { date: "", count: 0 };
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

// --- time formatter ---

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [remaining, setRemaining] = useState(() => {
    const u = getUsage();
    const today = new Date().toDateString();
    return u.date === today ? Math.max(0, FREE_LIMIT - u.count) : FREE_LIMIT;
  });

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addToHistory = useCallback((entryUrl: string, entryReadme: string) => {
    const prev = loadHistory();
    const next = [{ url: entryUrl, readme: entryReadme, time: Date.now() }, ...prev];
    saveHistory(next);
    setHistory(next.slice(0, 10));
  }, []);

  function loadEntry(entry: HistoryEntry) {
    setUrl(entry.url);
    setReadme(entry.readme);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearHistory() {
    localStorage.removeItem("inkwell_history");
    setHistory([]);
  }

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
        addToHistory(url, data.readme);
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

          {/* Gentle reminder */}
          <div className="w-full p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 mb-3 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              AI did the heavy lifting, but a quick human review goes a long way.{' '}
              Double-check repo links, version numbers, and license info before publishing.
            </span>
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

      {/* History */}
      {history.length > 0 && (
        <div className="w-full mt-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">History</h2>
            <button
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-red-500 transition"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <button
                key={`${entry.time}-${i}`}
                onClick={() => loadEntry(entry)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition group"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm truncate font-mono text-gray-700 dark:text-gray-300">
                    {entry.url.replace("https://github.com/", "")}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(entry.time)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}


"use client";

import { useState } from "react";
import {
  saveClaudeToken,
  clearClaudeToken,
} from "@/lib/claude-token";

type Props = {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export default function ClaudeTokenModal({
  open,
  onClose,
  onConnected,
}: Props) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleConnect() {
    setError("");

    const cleanToken = token.trim();

    if (!cleanToken) {
      setError("Please enter your Anthropic API key.");
      return;
    }

    setLoading(true);

    try {
      // Validate the token before saving it.
      const response = await fetch(
        "/api/auth/healthcheck/ai",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({
            action: "validate",
            apiKey: cleanToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Could not validate your Claude API key."
        );
      }

      await saveClaudeToken(cleanToken);

      setToken("");
      onConnected();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Claude authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    clearClaudeToken();
    setToken("");
    setError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connect Claude AI
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your Anthropic API key.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Your Claude account can use a different email
          address from your Google Tag Manager account.
        </div>

        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
          Anthropic API key
        </label>

        <div className="flex gap-2">
          <input
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste your Anthropic API key"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />

          <button
            type="button"
            onClick={() => setShowToken((value) => !value)}
            className="rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:text-white"
          >
            {showToken ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-gray-500">
          Your API key is not saved in our application
          database. It is encrypted in this browser&apos;s
          local storage. The temporary encryption key is
          kept in this browser session. Closing the
          browser session may require you to reconnect.
        </p>

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            Remove saved key
          </button>

          <button
            type="button"
            onClick={handleConnect}
            disabled={loading || !token.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Validating..." : "Validate and connect"}
          </button>
        </div>
      </div>
    </div>
  );
}

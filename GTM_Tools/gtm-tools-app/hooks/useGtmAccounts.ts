"use client";

import { useEffect, useState } from "react";

interface GTMAccount {
  accountId: string;
  name: string;
  path: string;
}

export function useGtmAccounts() {
  const [accounts, setAccounts] = useState<GTMAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAccounts() {
      try {
        setLoading(true);

        const res = await fetch("/api/auth/gtm/accounts");
        const text = await res.text(); // read response as text first

        if (!res.ok) {
          throw new Error(text);
        }

        const data = JSON.parse(text); // parse only if it is JSON
        setAccounts(data.account || []);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  return { accounts, loading, error };
}



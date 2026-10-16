"use client";

import { useEffect, useState } from "react";

interface GTMItem {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  name?: string;
  publicId?: string;
  path?: string;
}

interface GTMSelectorProps {
  onChange?: (values: {
    accountId: string;
    containerId: string;
    workspaceId: string;
  }) => void;
}

// =====================================================
// USE THE EXISTING WORKING GTM API ROUTES
// =====================================================

const ACCOUNTS_API = "/api/auth/gtm/accounts";
const CONTAINERS_API = "/api/auth/gtm/containers";
const WORKSPACES_API = "/api/auth/gtm/workspaces";

// =====================================================
// SAFE API RESPONSE
// =====================================================

async function readApiResponse(
  response: Response
): Promise<Record<string, unknown>> {
  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  console.log(
    "[GTMSelector] API:",
    response.url,
    "Status:",
    response.status
  );

  console.log(
    "[GTMSelector] Content-Type:",
    contentType
  );

  if (!contentType.toLowerCase().includes("application/json")) {
    console.error(
      "[GTMSelector] Non-JSON response:",
      text.slice(0, 500)
    );

    throw new Error(
      `GTM API returned a non-JSON response (${response.status}). ` +
        `Check the API route: ${response.url}`
    );
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error(
      "[GTMSelector] Invalid JSON:",
      text.slice(0, 500)
    );

    throw new Error(
      `GTM API returned invalid JSON (${response.status}).`
    );
  }
}

// =====================================================
// COMPONENT
// =====================================================

export default function GTMSelector({
  onChange,
}: GTMSelectorProps) {
  const [accounts, setAccounts] =
    useState<GTMItem[]>([]);

  const [containers, setContainers] =
    useState<GTMItem[]>([]);

  const [workspaces, setWorkspaces] =
    useState<GTMItem[]>([]);

  const [accountId, setAccountId] =
    useState("");

  const [containerId, setContainerId] =
    useState("");

  const [workspaceId, setWorkspaceId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // LOAD ACCOUNTS
  // =====================================================

  useEffect(() => {
    loadAccounts();
  }, []);

  // =====================================================
  // SEND SELECTION TO PARENT
  // =====================================================

  useEffect(() => {
    if (
      accountId &&
      containerId &&
      workspaceId
    ) {
      onChange?.({
        accountId,
        containerId,
        workspaceId,
      });
    }
  }, [
    accountId,
    containerId,
    workspaceId,
    onChange,
  ]);

  // =====================================================
  // ACCOUNTS
  // =====================================================

  async function loadAccounts() {
    try {
      setLoading(true);

      const response = await fetch(
        ACCOUNTS_API,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to load accounts"
        );
      }

      const accountData =
        Array.isArray(data.account)
          ? data.account
          : [];

      setAccounts(
        accountData as GTMItem[]
      );

      console.log(
        "[GTMSelector] Accounts loaded:",
        accountData
      );
    } catch (error) {
      console.error(
        "[GTMSelector] Accounts error:",
        error
      );

      setAccounts([]);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load accounts"
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // ACCOUNT CHANGE
  // =====================================================

  async function handleAccount(
    value: string
  ) {
    setAccountId(value);

    setContainerId("");
    setWorkspaceId("");

    setContainers([]);
    setWorkspaces([]);

    if (!value) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${CONTAINERS_API}?accountId=${encodeURIComponent(
          value
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to load containers"
        );
      }

      const containerData =
        Array.isArray(data.container)
          ? data.container
          : [];

      setContainers(
        containerData as GTMItem[]
      );

      console.log(
        "[GTMSelector] Containers loaded:",
        containerData
      );
    } catch (error) {
      console.error(
        "[GTMSelector] Containers error:",
        error
      );

      setContainers([]);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load containers"
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CONTAINER CHANGE
  // =====================================================

  async function handleContainer(
    value: string
  ) {
    setContainerId(value);

    setWorkspaceId("");

    setWorkspaces([]);

    if (!value) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${WORKSPACES_API}?accountId=${encodeURIComponent(
          accountId
        )}&containerId=${encodeURIComponent(
          value
        )}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to load workspaces"
        );
      }

      const workspaceData =
        Array.isArray(data.workspace)
          ? data.workspace
          : [];

      setWorkspaces(
        workspaceData as GTMItem[]
      );

      console.log(
        "[GTMSelector] Workspaces loaded:",
        workspaceData
      );
    } catch (error) {
      console.error(
        "[GTMSelector] Workspaces error:",
        error
      );

      setWorkspaces([]);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load workspaces"
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div>
        <h3 className="text-sm font-semibold text-fg">
          Select GTM Workspace
        </h3>

        <p className="mt-1 text-xs text-muted">
          Select Account → Container → Workspace.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {/* =================================================
            ACCOUNT
        ================================================= */}

        <select
          value={accountId}
          onChange={(event) =>
            handleAccount(
              event.target.value
            )
          }
          disabled={loading}
          className="rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none disabled:opacity-50"
        >
          <option value="">
            Select Account
          </option>

          {accounts.map((account) => (
            <option
              key={
                account.accountId ||
                account.path ||
                account.name
              }
              value={
                account.accountId || ""
              }
            >
              {account.name ||
                account.accountId}
            </option>
          ))}
        </select>

        {/* =================================================
            CONTAINER
        ================================================= */}

        <select
          value={containerId}
          disabled={
            !accountId || loading
          }
          onChange={(event) =>
            handleContainer(
              event.target.value
            )
          }
          className="rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none disabled:opacity-50"
        >
          <option value="">
            Select Container
          </option>

          {containers.map(
            (container) => (
              <option
                key={
                  container.containerId ||
                  container.path ||
                  container.name
                }
                value={
                  container.containerId ||
                  ""
                }
              >
                {container.name ||
                  container.containerId}
              </option>
            )
          )}
        </select>

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <select
          value={workspaceId}
          disabled={
            !containerId || loading
          }
          onChange={(event) =>
            setWorkspaceId(
              event.target.value
            )
          }
          className="rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none disabled:opacity-50"
        >
          <option value="">
            Select Workspace
          </option>

          {workspaces.map(
            (workspace) => (
              <option
                key={
                  workspace.workspaceId ||
                  workspace.path ||
                  workspace.name
                }
                value={
                  workspace.workspaceId ||
                  ""
                }
              >
                {workspace.name ||
                  workspace.workspaceId}
              </option>
            )
          )}
        </select>
      </div>

      {loading && (
        <p className="mt-3 text-xs text-muted">
          Loading GTM data...
        </p>
      )}
    </div>
  );
}
"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

interface Props {
  show: boolean;
  onClose: () => void;
  accounts: any[];
  accountsLoading: boolean;
}

export default function AccountContainerModal({
  show,
  onClose,
  accounts,
  accountsLoading,
}: Props) {
  const {
    selectedAccountId,
    selectedContainerId,

    setSelectedAccountId,
    setSelectedContainerId,

    containers,
    containersLoading,
    containersError,
    containerCrudLoading,
  } = useDashboardStore();

  const {
    fetchContainers,
    openCreateContainerModal,
    openEditContainerModal,
    handleDeleteContainer,
  } = useDashboardActions();

  const [activeTab, setActiveTab] = useState<"all" | "favourites" | "recent">(
    "all"
  );

  // ✅ FIXED useEffect (Runs only when selectedAccountId changes)
  useEffect(() => {
    if (selectedAccountId) {
      fetchContainers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50">
      <div className="bg-white w-full max-w-5xl mt-16 rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-white">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Tag Manager Accounts
            </h2>

            <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-2 ${
                  activeTab === "all"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "hover:text-gray-900"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setActiveTab("favourites")}
                className={`pb-2 ${
                  activeTab === "favourites"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "hover:text-gray-900"
                }`}
              >
                Favourites
              </button>

              <button
                onClick={() => setActiveTab("recent")}
                className={`pb-2 ${
                  activeTab === "recent"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "hover:text-gray-900"
                }`}
              >
                Recent
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-12 min-h-125">
          {/* LEFT COLUMN: ACCOUNTS */}
          <div className="col-span-4 border-r bg-gray-50">
            <div className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase border-b">
              Tag Manager Accounts
            </div>

            <div className="overflow-y-auto max-h-125">
              {accountsLoading && (
                <p className="p-4 text-sm text-gray-500">Loading accounts...</p>
              )}

              {!accountsLoading &&
                accounts.map((acc: any) => {
                  const isActive = selectedAccountId === acc.accountId;

                  return (
                    <button
                      key={acc.accountId}
                      onClick={() => setSelectedAccountId(acc.accountId)}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-gray-100 transition ${
                        isActive ? "bg-gray-200" : ""
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {acc.name}
                      </p>
                      <p className="text-xs text-gray-500">{acc.accountId}</p>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* RIGHT COLUMN: CONTAINERS */}
          <div className="col-span-8 bg-white">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="text-sm font-semibold text-gray-700">Containers</p>

              <button
                disabled={!selectedAccountId || containerCrudLoading}
                onClick={openCreateContainerModal}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                + New Container
              </button>
            </div>

            {/* Containers List */}
            <div className="overflow-y-auto max-h-125">
              {!selectedAccountId && (
                <p className="p-6 text-sm text-gray-500">
                  Select an account to view containers.
                </p>
              )}

              {containersLoading && selectedAccountId && (
                <p className="p-6 text-sm text-gray-500">
                  Loading containers...
                </p>
              )}

              {containersError && (
                <p className="p-6 text-sm text-red-600">{containersError}</p>
              )}

              {!containersLoading &&
                selectedAccountId &&
                containers.map((c: any) => {
                  const isSelected = selectedContainerId === c.containerId;

                  return (
                    <div
                      key={c.containerId}
                      className={`flex justify-between items-center px-5 py-4 border-b hover:bg-gray-50 transition ${
                        isSelected ? "bg-gray-100" : ""
                      }`}
                    >
                      {/* Container Info */}
                      <button
                        onClick={() => setSelectedContainerId(c.containerId)}
                        className="text-left flex-1"
                      >
                        <p className="text-sm font-semibold text-gray-900">
                          {c.name}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          Container ID: {c.containerId}
                        </p>
                      </button>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          disabled={containerCrudLoading}
                          onClick={() => {
                            setSelectedContainerId(c.containerId);
                            openEditContainerModal();
                          }}
                          className="px-3 py-1 text-xs font-semibold border rounded hover:bg-gray-100 disabled:bg-gray-200"
                        >
                          Edit
                        </button>

                        <button
                          disabled={containerCrudLoading}
                          onClick={() => {
                            setSelectedContainerId(c.containerId);
                            handleDeleteContainer();
                          }}
                          className="px-3 py-1 text-xs font-semibold border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:bg-gray-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

              {selectedAccountId &&
                !containersLoading &&
                containers.length === 0 && (
                  <p className="p-6 text-sm text-gray-500">
                    No containers found in this account.
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t bg-white text-xs text-gray-500">
          Accounts page
        </div>
      </div>
    </div>
  );
}
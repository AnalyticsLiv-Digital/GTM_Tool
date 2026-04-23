/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useDashboardActions } from "@/hooks/useDashboardActions";

interface Props {
    show: boolean;
    onClose: () => void;
    selectedTemplates: any[];
}

export default function ExportTemplatesModal({
    show,
    onClose,
    selectedTemplates,
}: Props) {
    useDashboardActions();

    const [targetAccountId, setTargetAccountId] = useState("");
    const [targetContainerId, setTargetContainerId] = useState("");
    const [targetWorkspaceId, setTargetWorkspaceId] = useState("");

    const [accounts, setAccounts] = useState<any[]>([]);
    const [targetContainers, setTargetContainers] = useState<any[]>([]);
    const [targetWorkspaces, setTargetWorkspaces] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);

    // Fetch accounts when modal opens
    useEffect(() => {
        if (!show) return;

        const fetchAccounts = async () => {
            try {
                const res = await fetch("/api/auth/gtm/accounts");
                const data = await res.json();

                if (!res.ok) throw new Error(data?.error || "Failed to fetch accounts");

                setAccounts(data.account || []);
            } catch (err: any) {
                alert(err.message);
            }
        };

        fetchAccounts();
    }, [show]);

    // Fetch containers when account changes
    useEffect(() => {
        if (!targetAccountId) return;

        const loadContainers = async () => {
            try {
                const res = await fetch(
                    `/api/auth/gtm/containers?accountId=${targetAccountId}`
                );
                const data = await res.json();

                if (!res.ok)
                    throw new Error(data?.error || "Failed to fetch containers");

                setTargetContainers(data.container || []);
                setTargetContainerId("");
                setTargetWorkspaceId("");
                setTargetWorkspaces([]);
            } catch (err: any) {
                alert(err.message);
            }
        };

        loadContainers();
    }, [targetAccountId]);

    // Fetch workspaces when container changes
    useEffect(() => {
        if (!targetAccountId || !targetContainerId) return;

        const loadWorkspaces = async () => {
            try {
                const res = await fetch(
                    `/api/auth/gtm/workspaces?accountId=${targetAccountId}&containerId=${targetContainerId}`
                );
                const data = await res.json();

                if (!res.ok)
                    throw new Error(data?.error || "Failed to fetch workspaces");

                setTargetWorkspaces(data.workspace || []);
                setTargetWorkspaceId("");
            } catch (err: any) {
                alert(err.message);
            }
        };

        loadWorkspaces();
    }, [targetAccountId, targetContainerId]);

    const handleExport = async () => {
        if (!targetAccountId || !targetContainerId || !targetWorkspaceId) {
            alert("Please select Account, Container and Workspace.");
            return;
        }

        if (selectedTemplates.length === 0) {
            alert("No templates selected.");
            return;
        }

        try {
            setLoading(true);

            const res = await fetch("/api/auth/gtm/templates/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: targetAccountId,
                    containerId: targetContainerId,
                    workspaceId: targetWorkspaceId,
                    template: selectedTemplates,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data?.error || "Export failed");
                return;
            }



            alert("Templates exported successfully!");
            onClose();
        } catch (err: any) {
            alert(err instanceof Error ? err.message : "Export failed");
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Export Templates
                </h2>

                <p className="text-sm text-gray-600 mb-4">
                    Selected Templates:{" "}
                    <span className="font-semibold">{selectedTemplates.length}</span>
                </p>

                {/* ACCOUNT */}
                <div className="mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                        Select Account
                    </label>
                    <select
                        value={targetAccountId}
                        onChange={(e) => setTargetAccountId(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm mt-1"
                    >
                        <option value="">-- Select Account --</option>
                        {accounts.map((acc: any) => (
                            <option key={acc.accountId} value={acc.accountId}>
                                {acc.name} ({acc.accountId})
                            </option>
                        ))}
                    </select>
                </div>

                {/* CONTAINER */}
                <div className="mb-3">
                    <label className="text-sm font-semibold text-gray-700">
                        Select Container
                    </label>
                    <select
                        value={targetContainerId}
                        onChange={(e) => setTargetContainerId(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm mt-1"
                        disabled={!targetAccountId}
                    >
                        <option value="">-- Select Container --</option>
                        {targetContainers.map((c: any) => (
                            <option key={c.containerId} value={c.containerId}>
                                {c.name} ({c.containerId})
                            </option>
                        ))}
                    </select>
                </div>

                {/* WORKSPACE */}
                <div className="mb-5">
                    <label className="text-sm font-semibold text-gray-700">
                        Select Workspace
                    </label>
                    <select
                        value={targetWorkspaceId}
                        onChange={(e) => setTargetWorkspaceId(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm mt-1"
                        disabled={!targetContainerId}
                    >
                        <option value="">-- Select Workspace --</option>
                        {targetWorkspaces.map((w: any) => (
                            <option key={w.workspaceId} value={w.workspaceId}>
                                {w.name} ({w.workspaceId})
                            </option>
                        ))}
                    </select>
                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-300"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? "Exporting..." : "Export Templates"}
                    </button>
                </div>
            </div>
        </div>
    );
}
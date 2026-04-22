/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";

export function useContainerCrud({
  selectedAccountId,
  selectedContainerId,
  containers,
  fetchContainers,
  setSelectedContainerId,
  setSelectedWorkspaceId,
}: any) {
  const selectedContainer = useMemo(() => {
    return containers.find((c: any) => c.containerId === selectedContainerId);
  }, [containers, selectedContainerId]);

  const [containerCrudLoading, setContainerCrudLoading] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerModalMode, setContainerModalMode] = useState<
    "create" | "edit"
  >("create");

  const [containerNameInput, setContainerNameInput] = useState("");

  function openCreateContainerModal() {
    setContainerModalMode("create");
    setContainerNameInput("");
    setShowContainerModal(true);
  }

  function openEditContainerModal() {
    if (!selectedContainer) {
      alert("Please select a container first.");
      return;
    }

    setContainerModalMode("edit");
    setContainerNameInput(selectedContainer.name || "");
    setShowContainerModal(true);
  }

  async function handleSaveContainer() {
    if (!selectedAccountId) {
      alert("Please select an account first.");
      return;
    }

    if (!containerNameInput.trim()) {
      alert("Container name is required.");
      return;
    }

    try {
      setContainerCrudLoading(true);

      if (containerModalMode === "create") {
        const res = await fetch("/api/auth/gtm/containers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            name: containerNameInput.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to create container");
        }

        alert("Container created successfully!");
      }

      if (containerModalMode === "edit") {
        if (!selectedContainerId) {
          alert("No container selected.");
          return;
        }

        const res = await fetch("/api/auth/gtm/containers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            containerId: selectedContainerId,
            name: containerNameInput.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update container");
        }

        alert("Container updated successfully!");
      }

      setShowContainerModal(false);
      await fetchContainers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Something went wrong");
      }
    } finally {
      setContainerCrudLoading(false);
    }
  }

  async function handleDeleteContainer() {
    if (!selectedAccountId || !selectedContainerId) {
      alert("Please select an account and container first.");
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to delete this container?\n\nContainer ID: ${selectedContainerId}`
    );

    if (!confirmDelete) return;

    try {
      setContainerCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/containers?accountId=${selectedAccountId}&containerId=${selectedContainerId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete container");
      }

      alert("Container deleted successfully!");
      setSelectedContainerId("");
      setSelectedWorkspaceId("");
      await fetchContainers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Something went wrong");
      }
    } finally {
      setContainerCrudLoading(false);
    }
  }

  return {
    containerCrudLoading,
    showContainerModal,
    containerModalMode,
    containerNameInput,
    setContainerNameInput,
    openCreateContainerModal,
    openEditContainerModal,
    handleSaveContainer,
    handleDeleteContainer,
    setShowContainerModal,
  };
}
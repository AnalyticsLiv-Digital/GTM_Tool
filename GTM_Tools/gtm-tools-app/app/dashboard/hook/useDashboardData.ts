/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface DashboardStore {
  // Selected IDs
  selectedContainerId: string;
  selectedWorkspaceId: string;

  setSelectedContainerId: (id: string) => void;
  setSelectedWorkspaceId: (id: string) => void;

  // Containers
  containers: any[];
  containersLoading: boolean;
  containersError: string;

  // Workspaces
  workspaces: any[];
  workspacesLoading: boolean;
  workspacesError: string;

  // Tags
  tags: any[];
  tagsLoading: boolean;
  tagsError: string;

  // Triggers
  triggers: any[];
  triggersLoading: boolean;
  triggersError: string;

  // Variables
  variables: any[];
  variablesLoading: boolean;
  variablesError: string;

  // Fetch Functions
  fetchContainers: (accountId: string) => Promise<void>;
  fetchWorkspaces: (accountId: string, containerId: string) => Promise<void>;
  fetchWorkspaceData: (
    accountId: string,
    containerId: string,
    workspaceId: string
  ) => Promise<void>;

  // Container CRUD
  containerCrudLoading: boolean;
  showContainerModal: boolean;
  containerModalMode: "create" | "edit";
  containerNameInput: string;

  setContainerNameInput: (name: string) => void;
  setShowContainerModal: (show: boolean) => void;

  openCreateContainerModal: () => void;
  openEditContainerModal: (containerName: string) => void;

  handleSaveContainer: (
    accountId: string,
    containerId?: string
  ) => Promise<void>;

  handleDeleteContainer: (
    accountId: string,
    containerId: string
  ) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Selected IDs
  selectedContainerId: "",
  selectedWorkspaceId: "",

  setSelectedContainerId: (id) => set({ selectedContainerId: id }),
  setSelectedWorkspaceId: (id) => set({ selectedWorkspaceId: id }),

  // Containers
  containers: [],
  containersLoading: false,
  containersError: "",

  // Workspaces
  workspaces: [],
  workspacesLoading: false,
  workspacesError: "",

  // Tags
  tags: [],
  tagsLoading: false,
  tagsError: "",

  // Triggers
  triggers: [],
  triggersLoading: false,
  triggersError: "",

  // Variables
  variables: [],
  variablesLoading: false,
  variablesError: "",

  // Fetch Containers
  fetchContainers: async (accountId: string) => {
    if (!accountId) return;

    try {
      set({
        containersLoading: true,
        containersError: "",
        containers: [],
        selectedContainerId: "",
        workspaces: [],
        selectedWorkspaceId: "",
        tags: [],
        triggers: [],
        variables: [],
      });

      const res = await fetch(`/api/auth/gtm/containers?accountId=${accountId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch containers");
      }

      set({ containers: data.container || [] });
    } catch (err: any) {
      set({ containersError: err.message || "Failed to fetch containers" });
    } finally {
      set({ containersLoading: false });
    }
  },

  // Fetch Workspaces
  fetchWorkspaces: async (accountId: string, containerId: string) => {
    if (!accountId || !containerId) return;

    try {
      set({
        workspacesLoading: true,
        workspacesError: "",
        workspaces: [],
        selectedWorkspaceId: "",
        tags: [],
        triggers: [],
        variables: [],
      });

      const res = await fetch(
        `/api/auth/gtm/workspaces?accountId=${accountId}&containerId=${containerId}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch workspaces");
      }

      set({ workspaces: data.workspace || [] });
    } catch (err: any) {
      set({ workspacesError: err.message || "Failed to fetch workspaces" });
    } finally {
      set({ workspacesLoading: false });
    }
  },

  // Fetch Tags/Triggers/Variables
  fetchWorkspaceData: async (
    accountId: string,
    containerId: string,
    workspaceId: string
  ) => {
    if (!accountId || !containerId || !workspaceId) return;

    try {
      set({
        tagsLoading: true,
        triggersLoading: true,
        variablesLoading: true,

        tagsError: "",
        triggersError: "",
        variablesError: "",

        tags: [],
        triggers: [],
        variables: [],
      });

      // TAGS
      const tagsRes = await fetch(
        `/api/auth/gtm/tag?accountId=${accountId}&containerId=${containerId}&workspaceId=${workspaceId}`
      );
      const tagsData = await tagsRes.json();

      if (!tagsRes.ok) {
        throw new Error(tagsData?.error || "Failed to fetch tags");
      }

      // TRIGGERS
      const triggersRes = await fetch(
        `/api/auth/gtm/triggers?accountId=${accountId}&containerId=${containerId}&workspaceId=${workspaceId}`
      );
      const triggersData = await triggersRes.json();

      if (!triggersRes.ok) {
        throw new Error(triggersData?.error || "Failed to fetch triggers");
      }

      // VARIABLES
      const variablesRes = await fetch(
        `/api/auth/gtm/variable?accountId=${accountId}&containerId=${containerId}&workspaceId=${workspaceId}`
      );
      const variablesData = await variablesRes.json();

      if (!variablesRes.ok) {
        throw new Error(variablesData?.error || "Failed to fetch variables");
      }

      set({
        tags: tagsData.tag || [],
        triggers: triggersData.trigger || [],
        variables: variablesData.variable || [],
      });
    } catch (err: any) {
      set({
        tagsError: err.message || "Failed to fetch workspace data",
        triggersError: err.message || "Failed to fetch workspace data",
        variablesError: err.message || "Failed to fetch workspace data",
      });
    } finally {
      set({
        tagsLoading: false,
        triggersLoading: false,
        variablesLoading: false,
      });
    }
  },

  // Container CRUD
  containerCrudLoading: false,
  showContainerModal: false,
  containerModalMode: "create",
  containerNameInput: "",

  setContainerNameInput: (name) => set({ containerNameInput: name }),
  setShowContainerModal: (show) => set({ showContainerModal: show }),

  openCreateContainerModal: () =>
    set({
      containerModalMode: "create",
      containerNameInput: "",
      showContainerModal: true,
    }),

  openEditContainerModal: (containerName: string) =>
    set({
      containerModalMode: "edit",
      containerNameInput: containerName || "",
      showContainerModal: true,
    }),

  handleSaveContainer: async (accountId: string, containerId?: string) => {
    const { containerModalMode, containerNameInput } = get();

    if (!accountId) {
      alert("Please select an account first.");
      return;
    }

    if (!containerNameInput.trim()) {
      alert("Container name is required.");
      return;
    }

    try {
      set({ containerCrudLoading: true });

      // CREATE
      if (containerModalMode === "create") {
        const res = await fetch("/api/auth/gtm/containers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            name: containerNameInput.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to create container");
        }

        alert("Container created successfully!");
      }

      // EDIT
      if (containerModalMode === "edit") {
        if (!containerId) {
          alert("No container selected.");
          return;
        }

        const res = await fetch("/api/auth/gtm/containers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            containerId,
            name: containerNameInput.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update container");
        }

        alert("Container updated successfully!");
      }

      set({ showContainerModal: false });

      // Refresh containers after save
      await get().fetchContainers(accountId);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      set({ containerCrudLoading: false });
    }
  },

  handleDeleteContainer: async (accountId: string, containerId: string) => {
    if (!accountId || !containerId) {
      alert("Please select an account and container first.");
      return;
    }

    const confirmDelete = confirm(
      `Are you sure you want to delete this container?\n\nContainer ID: ${containerId}`
    );

    if (!confirmDelete) return;

    try {
      set({ containerCrudLoading: true });

      const res = await fetch(
        `/api/auth/gtm/containers?accountId=${accountId}&containerId=${containerId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete container");
      }

      alert("Container deleted successfully!");

      set({
        selectedContainerId: "",
        workspaces: [],
        selectedWorkspaceId: "",
        tags: [],
        triggers: [],
        variables: [],
      });

      await get().fetchContainers(accountId);
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    } finally {
      set({ containerCrudLoading: false });
    }
  },
}));
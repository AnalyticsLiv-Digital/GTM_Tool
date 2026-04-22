/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface DashboardStore {
  // Selected IDs
  selectedAccountId: string;
  selectedContainerId: string;
  selectedWorkspaceId: string;

  selectedTagId: string;
  selectedTriggerId: string;
  selectedVariableId: string;

  setSelectedAccountId: (id: string) => void;
  setSelectedContainerId: (id: string) => void;
  setSelectedWorkspaceId: (id: string) => void;

  setSelectedTagId: (id: string) => void;
  setSelectedTriggerId: (id: string) => void;
  setSelectedVariableId: (id: string) => void;

  // Data
  containers: any[];
  workspaces: any[];
  tags: any[];
  triggers: any[];
  variables: any[];

  // Loading & Errors
  containersLoading: boolean;
  containersError: string;

  workspacesLoading: boolean;
  workspacesError: string;

  tagsLoading: boolean;
  tagsError: string;

  triggersLoading: boolean;
  triggersError: string;

  variablesLoading: boolean;
  variablesError: string;

  setContainers: (data: any[]) => void;
  setWorkspaces: (data: any[]) => void;
  setTags: (data: any[]) => void;
  setTriggers: (data: any[]) => void;
  setVariables: (data: any[]) => void;

  setContainersLoading: (val: boolean) => void;
  setWorkspacesLoading: (val: boolean) => void;
  setTagsLoading: (val: boolean) => void;
  setTriggersLoading: (val: boolean) => void;
  setVariablesLoading: (val: boolean) => void;

  setContainersError: (msg: string) => void;
  setWorkspacesError: (msg: string) => void;
  setTagsError: (msg: string) => void;
  setTriggersError: (msg: string) => void;
  setVariablesError: (msg: string) => void;

  // Container Modal
  showContainerModal: boolean;
  containerModalMode: "create" | "edit";
  containerNameInput: string;
  containerCrudLoading: boolean;

  setShowContainerModal: (val: boolean) => void;
  setContainerModalMode: (mode: "create" | "edit") => void;
  setContainerNameInput: (val: string) => void;
  setContainerCrudLoading: (val: boolean) => void;

  // Workspace Modal
  showWorkspaceModal: boolean;
  workspaceModalMode: "create" | "edit";
  workspaceNameInput: string;
  workspaceCrudLoading: boolean;

  setShowWorkspaceModal: (val: boolean) => void;
  setWorkspaceModalMode: (mode: "create" | "edit") => void;
  setWorkspaceNameInput: (val: string) => void;
  setWorkspaceCrudLoading: (val: boolean) => void;

  // Tag Modal
  showTagModal: boolean;
  tagModalMode: "create" | "edit";
  tagNameInput: string;
  tagCrudLoading: boolean;

  setShowTagModal: (val: boolean) => void;
  setTagModalMode: (mode: "create" | "edit") => void;
  setTagNameInput: (val: string) => void;
  setTagCrudLoading: (val: boolean) => void;

  // Trigger Modal
  showTriggerModal: boolean;
  triggerModalMode: "create" | "edit";
  triggerNameInput: string;
  triggerCrudLoading: boolean;

  setShowTriggerModal: (val: boolean) => void;
  setTriggerModalMode: (mode: "create" | "edit") => void;
  setTriggerNameInput: (val: string) => void;
  setTriggerCrudLoading: (val: boolean) => void;

  // Variable Modal
  showVariableModal: boolean;
  variableModalMode: "create" | "edit";
  variableNameInput: string;
  variableCrudLoading: boolean;

  setShowVariableModal: (val: boolean) => void;
  setVariableModalMode: (mode: "create" | "edit") => void;
  setVariableNameInput: (val: string) => void;
  setVariableCrudLoading: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  // Selected IDs
  selectedAccountId: "",
  selectedContainerId: "",
  selectedWorkspaceId: "",

  selectedTagId: "",
  selectedTriggerId: "",
  selectedVariableId: "",

  setSelectedAccountId: (id) =>
    set({
      selectedAccountId: id,
      selectedContainerId: "",
      selectedWorkspaceId: "",
      selectedTagId: "",
      selectedTriggerId: "",
      selectedVariableId: "",
    }),

  setSelectedContainerId: (id) =>
    set({
      selectedContainerId: id,
      selectedWorkspaceId: "",
      selectedTagId: "",
      selectedTriggerId: "",
      selectedVariableId: "",
    }),

  setSelectedWorkspaceId: (id) =>
    set({
      selectedWorkspaceId: id,
      selectedTagId: "",
      selectedTriggerId: "",
      selectedVariableId: "",
    }),

  setSelectedTagId: (id) => set({ selectedTagId: id }),
  setSelectedTriggerId: (id) => set({ selectedTriggerId: id }),
  setSelectedVariableId: (id) => set({ selectedVariableId: id }),

  // Data
  containers: [],
  workspaces: [],
  tags: [],
  triggers: [],
  variables: [],

  setContainers: (data) => set({ containers: data }),
  setWorkspaces: (data) => set({ workspaces: data }),
  setTags: (data) => set({ tags: data }),
  setTriggers: (data) => set({ triggers: data }),
  setVariables: (data) => set({ variables: data }),

  // Loading + Errors
  containersLoading: false,
  containersError: "",
  workspacesLoading: false,
  workspacesError: "",
  tagsLoading: false,
  tagsError: "",
  triggersLoading: false,
  triggersError: "",
  variablesLoading: false,
  variablesError: "",

  setContainersLoading: (val) => set({ containersLoading: val }),
  setWorkspacesLoading: (val) => set({ workspacesLoading: val }),
  setTagsLoading: (val) => set({ tagsLoading: val }),
  setTriggersLoading: (val) => set({ triggersLoading: val }),
  setVariablesLoading: (val) => set({ variablesLoading: val }),

  setContainersError: (msg) => set({ containersError: msg }),
  setWorkspacesError: (msg) => set({ workspacesError: msg }),
  setTagsError: (msg) => set({ tagsError: msg }),
  setTriggersError: (msg) => set({ triggersError: msg }),
  setVariablesError: (msg) => set({ variablesError: msg }),

  // Container Modal
  showContainerModal: false,
  containerModalMode: "create",
  containerNameInput: "",
  containerCrudLoading: false,

  setShowContainerModal: (val) => set({ showContainerModal: val }),
  setContainerModalMode: (mode) => set({ containerModalMode: mode }),
  setContainerNameInput: (val) => set({ containerNameInput: val }),
  setContainerCrudLoading: (val) => set({ containerCrudLoading: val }),

  // Workspace Modal
  showWorkspaceModal: false,
  workspaceModalMode: "create",
  workspaceNameInput: "",
  workspaceCrudLoading: false,

  setShowWorkspaceModal: (val) => set({ showWorkspaceModal: val }),
  setWorkspaceModalMode: (mode) => set({ workspaceModalMode: mode }),
  setWorkspaceNameInput: (val) => set({ workspaceNameInput: val }),
  setWorkspaceCrudLoading: (val) => set({ workspaceCrudLoading: val }),

  // Tag Modal
  showTagModal: false,
  tagModalMode: "create",
  tagNameInput: "",
  tagCrudLoading: false,

  setShowTagModal: (val) => set({ showTagModal: val }),
  setTagModalMode: (mode) => set({ tagModalMode: mode }),
  setTagNameInput: (val) => set({ tagNameInput: val }),
  setTagCrudLoading: (val) => set({ tagCrudLoading: val }),

  // Trigger Modal
  showTriggerModal: false,
  triggerModalMode: "create",
  triggerNameInput: "",
  triggerCrudLoading: false,

  setShowTriggerModal: (val) => set({ showTriggerModal: val }),
  setTriggerModalMode: (mode) => set({ triggerModalMode: mode }),
  setTriggerNameInput: (val) => set({ triggerNameInput: val }),
  setTriggerCrudLoading: (val) => set({ triggerCrudLoading: val }),

  // Variable Modal
  showVariableModal: false,
  variableModalMode: "create",
  variableNameInput: "",
  variableCrudLoading: false,

  setShowVariableModal: (val) => set({ showVariableModal: val }),
  setVariableModalMode: (mode) => set({ variableModalMode: mode }),
  setVariableNameInput: (val) => set({ variableNameInput: val }),
  setVariableCrudLoading: (val) => set({ variableCrudLoading: val }),
}));

// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { create } from "zustand";

// interface DashboardStore {
//   selectedAccountId: string;
//   selectedContainerId: string;
//   selectedWorkspaceId: string;

//   setSelectedAccountId: (id: string) => void;
//   setSelectedContainerId: (id: string) => void;
//   setSelectedWorkspaceId: (id: string) => void;

//   // ----------------
//   // DATA
//   // ----------------
//   containers: any[];
//   containersLoading: boolean;
//   containersError: string;

//   workspaces: any[];
//   workspacesLoading: boolean;
//   workspacesError: string;

//   tags: any[];
//   tagsLoading: boolean;
//   tagsError: string;

//   triggers: any[];
//   triggersLoading: boolean;
//   triggersError: string;

//   variables: any[];
//   variablesLoading: boolean;
//   variablesError: string;

//   // ----------------
//   // CONTAINER CRUD UI
//   // ----------------
//   containerCrudLoading: boolean;
//   showContainerModal: boolean;
//   containerModalMode: "create" | "edit";
//   containerNameInput: string;

//   setShowContainerModal: (val: boolean) => void;
//   setContainerModalMode: (mode: "create" | "edit") => void;
//   setContainerNameInput: (val: string) => void;

//   // ----------------
//   // WORKSPACE CRUD UI
//   // ----------------
//   workspaceCrudLoading: boolean;
//   showWorkspaceModal: boolean;
//   workspaceModalMode: "create" | "edit";
//   workspaceNameInput: string;

//   setShowWorkspaceModal: (val: boolean) => void;
//   setWorkspaceModalMode: (mode: "create" | "edit") => void;
//   setWorkspaceNameInput: (val: string) => void;

//   // ----------------
//   // TAG CRUD UI
//   // ----------------
//   tagCrudLoading: boolean;
//   showTagModal: boolean;
//   tagModalMode: "create" | "edit";
//   tagNameInput: string;
//   selectedTagId: string;

//   setShowTagModal: (val: boolean) => void;
//   setTagModalMode: (mode: "create" | "edit") => void;
//   setTagNameInput: (val: string) => void;
//   setSelectedTagId: (id: string) => void;

//   // ----------------
//   // TRIGGER CRUD UI
//   // ----------------
//   triggerCrudLoading: boolean;
//   showTriggerModal: boolean;
//   triggerModalMode: "create" | "edit";
//   triggerNameInput: string;
//   selectedTriggerId: string;

//   setShowTriggerModal: (val: boolean) => void;
//   setTriggerModalMode: (mode: "create" | "edit") => void;
//   setTriggerNameInput: (val: string) => void;
//   setSelectedTriggerId: (id: string) => void;

//   // ----------------
//   // VARIABLE CRUD UI
//   // ----------------
//   variableCrudLoading: boolean;
//   showVariableModal: boolean;
//   variableModalMode: "create" | "edit";
//   variableNameInput: string;
//   selectedVariableId: string;

//   setShowVariableModal: (val: boolean) => void;
//   setVariableModalMode: (mode: "create" | "edit") => void;
//   setVariableNameInput: (val: string) => void;
//   setSelectedVariableId: (id: string) => void;

//   // ----------------
//   // FETCH FUNCTIONS
//   // ----------------
//   fetchContainers: () => Promise<void>;
//   fetchWorkspaces: () => Promise<void>;
//   fetchWorkspaceData: () => Promise<void>;

//   // ----------------
//   // CONTAINER CRUD FUNCTIONS
//   // ----------------
//   openCreateContainerModal: () => void;
//   openEditContainerModal: () => void;
//   handleSaveContainer: () => Promise<void>;
//   handleDeleteContainer: () => Promise<void>;

//   // ----------------
//   // WORKSPACE CRUD FUNCTIONS
//   // ----------------
//   openCreateWorkspaceModal: () => void;
//   openEditWorkspaceModal: () => void;
//   handleSaveWorkspace: () => Promise<void>;
//   handleDeleteWorkspace: () => Promise<void>;

//   // ----------------
//   // TAG CRUD FUNCTIONS
//   // ----------------
//   openCreateTagModal: () => void;
//   openEditTagModal: () => void;
//   handleSaveTag: () => Promise<void>;
//   handleDeleteTag: () => Promise<void>;

//   // ----------------
//   // TRIGGER CRUD FUNCTIONS
//   // ----------------
//   openCreateTriggerModal: () => void;
//   openEditTriggerModal: () => void;
//   handleSaveTrigger: () => Promise<void>;
//   handleDeleteTrigger: () => Promise<void>;

//   // ----------------
//   // VARIABLE CRUD FUNCTIONS
//   // ----------------
//   openCreateVariableModal: () => void;
//   openEditVariableModal: () => void;
//   handleSaveVariable: () => Promise<void>;
//   handleDeleteVariable: () => Promise<void>;
// }

// export const useDashboardStore = create<DashboardStore>((set, get) => ({
//   selectedAccountId: "",
//   selectedContainerId: "",
//   selectedWorkspaceId: "",

//   setSelectedAccountId: (id) => {
//     set({
//       selectedAccountId: id,
//       selectedContainerId: "",
//       selectedWorkspaceId: "",
//       containers: [],
//       workspaces: [],
//       tags: [],
//       triggers: [],
//       variables: [],
//     });
//   },

//   setSelectedContainerId: (id) => {
//     set({
//       selectedContainerId: id,
//       selectedWorkspaceId: "",
//       workspaces: [],
//       tags: [],
//       triggers: [],
//       variables: [],
//     });
//   },

//   setSelectedWorkspaceId: (id) => {
//     set({
//       selectedWorkspaceId: id,
//       tags: [],
//       triggers: [],
//       variables: [],
//     });
//   },

//   // ----------------
//   // DATA
//   // ----------------
//   containers: [],
//   containersLoading: false,
//   containersError: "",

//   workspaces: [],
//   workspacesLoading: false,
//   workspacesError: "",

//   tags: [],
//   tagsLoading: false,
//   tagsError: "",

//   triggers: [],
//   triggersLoading: false,
//   triggersError: "",

//   variables: [],
//   variablesLoading: false,
//   variablesError: "",

//   // ----------------
//   // CONTAINER CRUD UI
//   // ----------------
//   containerCrudLoading: false,
//   showContainerModal: false,
//   containerModalMode: "create",
//   containerNameInput: "",

//   setShowContainerModal: (val) => set({ showContainerModal: val }),
//   setContainerModalMode: (mode) => set({ containerModalMode: mode }),
//   setContainerNameInput: (val) => set({ containerNameInput: val }),

//   // ----------------
//   // WORKSPACE CRUD UI
//   // ----------------
//   workspaceCrudLoading: false,
//   showWorkspaceModal: false,
//   workspaceModalMode: "create",
//   workspaceNameInput: "",

//   setShowWorkspaceModal: (val) => set({ showWorkspaceModal: val }),
//   setWorkspaceModalMode: (mode) => set({ workspaceModalMode: mode }),
//   setWorkspaceNameInput: (val) => set({ workspaceNameInput: val }),

//   // ----------------
//   // TAG CRUD UI
//   // ----------------
//   tagCrudLoading: false,
//   showTagModal: false,
//   tagModalMode: "create",
//   tagNameInput: "",
//   selectedTagId: "",

//   setShowTagModal: (val) => set({ showTagModal: val }),
//   setTagModalMode: (mode) => set({ tagModalMode: mode }),
//   setTagNameInput: (val) => set({ tagNameInput: val }),
//   setSelectedTagId: (id) => set({ selectedTagId: id }),

//   // ----------------
//   // TRIGGER CRUD UI
//   // ----------------
//   triggerCrudLoading: false,
//   showTriggerModal: false,
//   triggerModalMode: "create",
//   triggerNameInput: "",
//   selectedTriggerId: "",

//   setShowTriggerModal: (val) => set({ showTriggerModal: val }),
//   setTriggerModalMode: (mode) => set({ triggerModalMode: mode }),
//   setTriggerNameInput: (val) => set({ triggerNameInput: val }),
//   setSelectedTriggerId: (id) => set({ selectedTriggerId: id }),

//   // ----------------
//   // VARIABLE CRUD UI
//   // ----------------
//   variableCrudLoading: false,
//   showVariableModal: false,
//   variableModalMode: "create",
//   variableNameInput: "",
//   selectedVariableId: "",

//   setShowVariableModal: (val) => set({ showVariableModal: val }),
//   setVariableModalMode: (mode) => set({ variableModalMode: mode }),
//   setVariableNameInput: (val) => set({ variableNameInput: val }),
//   setSelectedVariableId: (id) => set({ selectedVariableId: id }),

//   // -----------------------------
//   // FETCH CONTAINERS
//   // -----------------------------
//   fetchContainers: async () => {
//     const { selectedAccountId } = get();
//     if (!selectedAccountId) return;

//     try {
//       set({
//         containersLoading: true,
//         containersError: "",
//         containers: [],
//         selectedContainerId: "",
//         workspaces: [],
//         selectedWorkspaceId: "",
//         tags: [],
//         triggers: [],
//         variables: [],
//       });

//       const res = await fetch(
//         `/api/auth/gtm/containers?accountId=${selectedAccountId}`
//       );

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data?.error || "Failed to fetch containers");
//       }

//       set({ containers: data.container || [] });
//     } catch (err: any) {
//       set({ containersError: err.message || "Error fetching containers" });
//     } finally {
//       set({ containersLoading: false });
//     }
//   },

//   // -----------------------------
//   // FETCH WORKSPACES
//   // -----------------------------
//   fetchWorkspaces: async () => {
//     const { selectedAccountId, selectedContainerId } = get();
//     if (!selectedAccountId || !selectedContainerId) return;

//     try {
//       set({
//         workspacesLoading: true,
//         workspacesError: "",
//         workspaces: [],
//         selectedWorkspaceId: "",
//         tags: [],
//         triggers: [],
//         variables: [],
//       });

//       const res = await fetch(
//         `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}`
//       );

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data?.error || "Failed to fetch workspaces");
//       }

//       set({ workspaces: data.workspace || [] });
//     } catch (err: any) {
//       set({ workspacesError: err.message || "Error fetching workspaces" });
//     } finally {
//       set({ workspacesLoading: false });
//     }
//   },

//   // -----------------------------
//   // FETCH TAGS/TRIGGERS/VARIABLES
//   // -----------------------------
//   fetchWorkspaceData: async () => {
//     const { selectedAccountId, selectedContainerId, selectedWorkspaceId } =
//       get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return;

//     try {
//       set({
//         tagsLoading: true,
//         triggersLoading: true,
//         variablesLoading: true,
//         tagsError: "",
//         triggersError: "",
//         variablesError: "",
//         tags: [],
//         triggers: [],
//         variables: [],
//       });

//       const tagsRes = await fetch(
//         `/api/auth/gtm/tags?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//       );
//       const tagsData = await tagsRes.json();
//       if (!tagsRes.ok) throw new Error(tagsData?.error || "Failed to fetch tags");

//       const triggersRes = await fetch(
//         `/api/auth/gtm/triggers?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//       );
//       const triggersData = await triggersRes.json();
//       if (!triggersRes.ok)
//         throw new Error(triggersData?.error || "Failed to fetch triggers");

//       const variablesRes = await fetch(
//         `/api/auth/gtm/variables?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
//       );
//       const variablesData = await variablesRes.json();
//       if (!variablesRes.ok)
//         throw new Error(variablesData?.error || "Failed to fetch variables");

//       set({
//         tags: tagsData.tag || [],
//         triggers: triggersData.trigger || [],
//         variables: variablesData.variable || [],
//       });
//     } catch (err: any) {
//       const message = err.message || "Error fetching workspace data";
//       set({
//         tagsError: message,
//         triggersError: message,
//         variablesError: message,
//       });
//     } finally {
//       set({
//         tagsLoading: false,
//         triggersLoading: false,
//         variablesLoading: false,
//       });
//     }
//   },

//   // -----------------------------
//   // CONTAINER CRUD FUNCTIONS
//   // -----------------------------
//   openCreateContainerModal: () => {
//     set({
//       containerModalMode: "create",
//       containerNameInput: "",
//       showContainerModal: true,
//     });
//   },

//   openEditContainerModal: () => {
//     const { containers, selectedContainerId } = get();
//     const selectedContainer = containers.find(
//       (c: any) => c.containerId === selectedContainerId
//     );

//     if (!selectedContainer) {
//       alert("Please select a container first.");
//       return;
//     }

//     set({
//       containerModalMode: "edit",
//       containerNameInput: selectedContainer.name || "",
//       showContainerModal: true,
//     });
//   },

//   handleSaveContainer: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       containerModalMode,
//       containerNameInput,
//       fetchContainers,
//     } = get();

//     if (!selectedAccountId) return alert("Select an account first");
//     if (!containerNameInput.trim()) return alert("Container name required");

//     try {
//       set({ containerCrudLoading: true });

//       if (containerModalMode === "create") {
//         const res = await fetch("/api/auth/gtm/containers", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             name: containerNameInput.trim(),
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Create failed");
//       }

//       if (containerModalMode === "edit") {
//         const res = await fetch("/api/auth/gtm/containers", {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             name: containerNameInput.trim(),
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Update failed");
//       }

//       set({ showContainerModal: false });
//       await fetchContainers();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ containerCrudLoading: false });
//     }
//   },

//   handleDeleteContainer: async () => {
//     const { selectedAccountId, selectedContainerId, fetchContainers } = get();
//     if (!selectedAccountId || !selectedContainerId)
//       return alert("Select account and container");

//     if (!confirm("Delete container?")) return;

//     try {
//       set({ containerCrudLoading: true });

//       const res = await fetch(
//         `/api/auth/gtm/containers?accountId=${selectedAccountId}&containerId=${selectedContainerId}`,
//         { method: "DELETE" }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Delete failed");

//       set({
//         selectedContainerId: "",
//         selectedWorkspaceId: "",
//         workspaces: [],
//         tags: [],
//         triggers: [],
//         variables: [],
//       });

//       await fetchContainers();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ containerCrudLoading: false });
//     }
//   },

//   // -----------------------------
//   // WORKSPACE CRUD FUNCTIONS
//   // -----------------------------
//   openCreateWorkspaceModal: () => {
//     const { workspaces } = get();
//     if (workspaces.length >= 3)
//       return alert("You can only create maximum 3 workspaces.");

//     set({
//       workspaceModalMode: "create",
//       workspaceNameInput: "",
//       showWorkspaceModal: true,
//     });
//   },

//   openEditWorkspaceModal: () => {
//     const { workspaces, selectedWorkspaceId } = get();
//     const ws = workspaces.find((w: any) => w.workspaceId === selectedWorkspaceId);

//     if (!ws) return alert("Select a workspace first");

//     set({
//       workspaceModalMode: "edit",
//       workspaceNameInput: ws.name || "",
//       showWorkspaceModal: true,
//     });
//   },

//   handleSaveWorkspace: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       workspaceModalMode,
//       workspaceNameInput,
//       fetchWorkspaces,
//       workspaces,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId)
//       return alert("Select account and container first");

//     if (!workspaceNameInput.trim()) return alert("Workspace name required");

//     if (workspaceModalMode === "create" && workspaces.length >= 3)
//       return alert("Max 3 workspaces allowed");

//     try {
//       set({ workspaceCrudLoading: true });

//       if (workspaceModalMode === "create") {
//         const res = await fetch("/api/auth/gtm/workspaces", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             name: workspaceNameInput.trim(),
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Create workspace failed");
//       }

//       if (workspaceModalMode === "edit") {
//         const res = await fetch("/api/auth/gtm/workspaces", {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             name: workspaceNameInput.trim(),
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Update workspace failed");
//       }

//       set({ showWorkspaceModal: false });
//       await fetchWorkspaces();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ workspaceCrudLoading: false });
//     }
//   },

//   handleDeleteWorkspace: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       fetchWorkspaces,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select account, container and workspace");

//     if (!confirm("Delete workspace?")) return;

//     try {
//       set({ workspaceCrudLoading: true });

//       const res = await fetch(
//         `/api/auth/gtm/workspaces?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`,
//         { method: "DELETE" }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Delete workspace failed");

//       set({
//         selectedWorkspaceId: "",
//         tags: [],
//         triggers: [],
//         variables: [],
//       });

//       await fetchWorkspaces();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ workspaceCrudLoading: false });
//     }
//   },

//   // -----------------------------
//   // TAG CRUD
//   // -----------------------------
//   openCreateTagModal: () => {
//     set({
//       tagModalMode: "create",
//       tagNameInput: "",
//       selectedTagId: "",
//       showTagModal: true,
//     });
//   },

//   openEditTagModal: () => {
//     const { tags, selectedTagId } = get();
//     const t = tags.find((x: any) => x.tagId === selectedTagId);

//     if (!t) return alert("Select a tag first");

//     set({
//       tagModalMode: "edit",
//       tagNameInput: t.name || "",
//       showTagModal: true,
//     });
//   },

//   handleSaveTag: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       tagModalMode,
//       tagNameInput,
//       selectedTagId,
//       fetchWorkspaceData,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select workspace first");

//     if (!tagNameInput.trim()) return alert("Tag name required");

//     try {
//       set({ tagCrudLoading: true });

//       if (tagModalMode === "create") {
//         const res = await fetch("/api/auth/gtm/tags", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             tag: {
//               name: tagNameInput.trim(),
//               type: "html",
//               parameter: [
//                 { type: "template", key: "html", value: "<h1>Hello GTM</h1>" },
//               ],
//             },
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Create tag failed");
//       }

//       if (tagModalMode === "edit") {
//         const res = await fetch("/api/auth/gtm/tags", {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             tagId: selectedTagId,
//             tag: {
//               name: tagNameInput.trim(),
//             },
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Update tag failed");
//       }

//       set({ showTagModal: false });
//       await fetchWorkspaceData();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ tagCrudLoading: false });
//     }
//   },

//   handleDeleteTag: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       selectedTagId,
//       fetchWorkspaceData,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select workspace first");

//     if (!selectedTagId) return alert("Select tag first");
//     if (!confirm("Delete tag?")) return;

//     try {
//       set({ tagCrudLoading: true });

//       const res = await fetch(
//         `/api/auth/gtm/tags?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}&tagId=${selectedTagId}`,
//         { method: "DELETE" }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Delete tag failed");

//       set({ selectedTagId: "" });
//       await fetchWorkspaceData();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ tagCrudLoading: false });
//     }
//   },

//   // -----------------------------
//   // TRIGGER CRUD
//   // -----------------------------
//   openCreateTriggerModal: () => {
//     set({
//       triggerModalMode: "create",
//       triggerNameInput: "",
//       selectedTriggerId: "",
//       showTriggerModal: true,
//     });
//   },

//   openEditTriggerModal: () => {
//     const { triggers, selectedTriggerId } = get();
//     const t = triggers.find((x: any) => x.triggerId === selectedTriggerId);

//     if (!t) return alert("Select trigger first");

//     set({
//       triggerModalMode: "edit",
//       triggerNameInput: t.name || "",
//       showTriggerModal: true,
//     });
//   },

//   handleSaveTrigger: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       triggerModalMode,
//       triggerNameInput,
//       selectedTriggerId,
//       fetchWorkspaceData,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select workspace first");

//     if (!triggerNameInput.trim()) return alert("Trigger name required");

//     try {
//       set({ triggerCrudLoading: true });

//       if (triggerModalMode === "create") {
//         const res = await fetch("/api/auth/gtm/triggers", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             trigger: {
//               name: triggerNameInput.trim(),
//               type: "pageview",
//             },
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Create trigger failed");
//       }

//       if (triggerModalMode === "edit") {
//         const res = await fetch("/api/auth/gtm/triggers", {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             triggerId: selectedTriggerId,
//             trigger: {
//               name: triggerNameInput.trim(),
//             },
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Update trigger failed");
//       }

//       set({ showTriggerModal: false });
//       await fetchWorkspaceData();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ triggerCrudLoading: false });
//     }
//   },

//   handleDeleteTrigger: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       selectedTriggerId,
//       fetchWorkspaceData,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select workspace first");

//     if (!selectedTriggerId) return alert("Select trigger first");
//     if (!confirm("Delete trigger?")) return;

//     try {
//       set({ triggerCrudLoading: true });

//       const res = await fetch(
//         `/api/auth/gtm/triggers?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}&triggerId=${selectedTriggerId}`,
//         { method: "DELETE" }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Delete trigger failed");

//       set({ selectedTriggerId: "" });
//       await fetchWorkspaceData();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ triggerCrudLoading: false });
//     }
//   },

//   // -----------------------------
//   // VARIABLE CRUD
//   // -----------------------------
//   openCreateVariableModal: () => {
//     set({
//       variableModalMode: "create",
//       variableNameInput: "",
//       selectedVariableId: "",
//       showVariableModal: true,
//     });
//   },

//   openEditVariableModal: () => {
//     const { variables, selectedVariableId } = get();
//     const v = variables.find((x: any) => x.variableId === selectedVariableId);

//     if (!v) return alert("Select variable first");

//     set({
//       variableModalMode: "edit",
//       variableNameInput: v.name || "",
//       showVariableModal: true,
//     });
//   },

//   handleSaveVariable: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       variableModalMode,
//       variableNameInput,
//       selectedVariableId,
//       fetchWorkspaceData,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select workspace first");

//     if (!variableNameInput.trim()) return alert("Variable name required");

//     try {
//       set({ variableCrudLoading: true });

//       if (variableModalMode === "create") {
//         const res = await fetch("/api/auth/gtm/variables", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             variable: {
//               name: variableNameInput.trim(),
//               type: "jsm",
//             },
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Create variable failed");
//       }

//       if (variableModalMode === "edit") {
//         const res = await fetch("/api/auth/gtm/variables", {
//           method: "PUT",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             accountId: selectedAccountId,
//             containerId: selectedContainerId,
//             workspaceId: selectedWorkspaceId,
//             variableId: selectedVariableId,
//             variable: {
//               name: variableNameInput.trim(),
//             },
//           }),
//         });

//         const data = await res.json();
//         if (!res.ok) throw new Error(data?.error || "Update variable failed");
//       }

//       set({ showVariableModal: false });
//       await fetchWorkspaceData();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ variableCrudLoading: false });
//     }
//   },

//   handleDeleteVariable: async () => {
//     const {
//       selectedAccountId,
//       selectedContainerId,
//       selectedWorkspaceId,
//       selectedVariableId,
//       fetchWorkspaceData,
//     } = get();

//     if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId)
//       return alert("Select workspace first");

//     if (!selectedVariableId) return alert("Select variable first");
//     if (!confirm("Delete variable?")) return;

//     try {
//       set({ variableCrudLoading: true });

//       const res = await fetch(
//         `/api/auth/gtm/variables?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}&variableId=${selectedVariableId}`,
//         { method: "DELETE" }
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Delete variable failed");

//       set({ selectedVariableId: "" });
//       await fetchWorkspaceData();
//     } catch (err: any) {
//       alert(err.message);
//     } finally {
//       set({ variableCrudLoading: false });
//     }
//   },
// }));
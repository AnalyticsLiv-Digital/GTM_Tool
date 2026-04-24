/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DashboardStore {
  workspaceModalMode: string;

  // Selected IDs
  selectedAccountId: string;
  selectedContainerId: string;
  selectedWorkspaceId: string;

  selectedTagId: string;
  selectedTriggerId: string;
  selectedVariableId: string;
  selectedTemplateId: string;

  setSelectedAccountId: (id: string) => void;
  setSelectedContainerId: (id: string) => void;
  setSelectedWorkspaceId: (id: string) => void;

  setSelectedTagId: (id: string) => void;
  setSelectedTriggerId: (id: string) => void;
  setSelectedVariableId: (id: string) => void;
  setSelectedTemplateId: (id: string) => void;

  // Data
  containers: any[];
  workspaces: any[];
  tags: any[];
  triggers: any[];
  variables: any[];
  templates: any[];

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

  templatesLoading: boolean;
  templatesError: string;

  setContainers: (data: any[]) => void;
  setWorkspaces: (data: any[]) => void;
  setTags: (data: any[]) => void;
  setTriggers: (data: any[]) => void;
  setVariables: (data: any[]) => void;
  setTemplates: (data: any[]) => void;

  setContainersLoading: (val: boolean) => void;
  setWorkspacesLoading: (val: boolean) => void;
  setTagsLoading: (val: boolean) => void;
  setTriggersLoading: (val: boolean) => void;
  setVariablesLoading: (val: boolean) => void;
  setTemplatesLoading: (val: boolean) => void;

  setContainersError: (msg: string) => void;
  setWorkspacesError: (msg: string) => void;
  setTagsError: (msg: string) => void;
  setTriggersError: (msg: string) => void;
  setVariablesError: (msg: string) => void;
  setTemplatesError: (msg: string) => void;

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
  workspaceNameInput: string;
  workspaceCrudLoading: boolean;

  setShowWorkspaceModal: (val: boolean) => void;
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

  // Template Modal
  showTemplateModal: boolean;
  templateModalMode: "create" | "edit";
  templateNameInput: string;
  templateCrudLoading: boolean;

  setShowTemplateModal: (val: boolean) => void;
  setTemplateModalMode: (mode: "create" | "edit") => void;
  setTemplateNameInput: (val: string) => void;
  setTemplateCrudLoading: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      workspaceModalMode: "create",

      // Selected IDs
      selectedAccountId: "",
      selectedContainerId: "",
      selectedWorkspaceId: "",

      selectedTagId: "",
      selectedTriggerId: "",
      selectedVariableId: "",
      selectedTemplateId: "",

      setSelectedAccountId: (id) =>
        set({
          selectedAccountId: id,
          selectedContainerId: "",
          selectedWorkspaceId: "",
          selectedTagId: "",
          selectedTriggerId: "",
          selectedVariableId: "",
          selectedTemplateId: "",

          containers: [],
          workspaces: [],
          tags: [],
          triggers: [],
          variables: [],
          templates: [],
        }),

      setSelectedContainerId: (id) =>
        set({
          selectedContainerId: id,
          selectedWorkspaceId: "",
          selectedTagId: "",
          selectedTriggerId: "",
          selectedVariableId: "",
          selectedTemplateId: "",

          workspaces: [],
          tags: [],
          triggers: [],
          variables: [],
          templates: [],
        }),

      setSelectedWorkspaceId: (id) =>
        set({
          selectedWorkspaceId: id,
          selectedTagId: "",
          selectedTriggerId: "",
          selectedVariableId: "",
          selectedTemplateId: "",

          tags: [],
          triggers: [],
          variables: [],
          templates: [],
        }),

      setSelectedTagId: (id) => set({ selectedTagId: id }),
      setSelectedTriggerId: (id) => set({ selectedTriggerId: id }),
      setSelectedVariableId: (id) => set({ selectedVariableId: id }),
      setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),

      // Data
      containers: [],
      workspaces: [],
      tags: [],
      triggers: [],
      variables: [],
      templates: [],

      setContainers: (data) => set({ containers: data }),
      setWorkspaces: (data) => set({ workspaces: data }),
      setTags: (data) => set({ tags: data }),
      setTriggers: (data) => set({ triggers: data }),
      setVariables: (data) => set({ variables: data }),
      setTemplates: (data) => set({ templates: data }),

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

      templatesLoading: false,
      templatesError: "",

      setContainersLoading: (val) => set({ containersLoading: val }),
      setWorkspacesLoading: (val) => set({ workspacesLoading: val }),
      setTagsLoading: (val) => set({ tagsLoading: val }),
      setTriggersLoading: (val) => set({ triggersLoading: val }),
      setVariablesLoading: (val) => set({ variablesLoading: val }),
      setTemplatesLoading: (val) => set({ templatesLoading: val }),

      setContainersError: (msg) => set({ containersError: msg }),
      setWorkspacesError: (msg) => set({ workspacesError: msg }),
      setTagsError: (msg) => set({ tagsError: msg }),
      setTriggersError: (msg) => set({ triggersError: msg }),
      setVariablesError: (msg) => set({ variablesError: msg }),
      setTemplatesError: (msg) => set({ templatesError: msg }),

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
      workspaceNameInput: "",
      workspaceCrudLoading: false,

      setShowWorkspaceModal: (val) => set({ showWorkspaceModal: val }),
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

      // Template Modal
      showTemplateModal: false,
      templateModalMode: "create",
      templateNameInput: "",
      templateCrudLoading: false,

      setShowTemplateModal: (val) => set({ showTemplateModal: val }),
      setTemplateModalMode: (mode) => set({ templateModalMode: mode }),
      setTemplateNameInput: (val) => set({ templateNameInput: val }),
      setTemplateCrudLoading: (val) => set({ templateCrudLoading: val }),
    }),
    {
      name: "gtm-dashboard-store", // localStorage key
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        selectedContainerId: state.selectedContainerId,
        selectedWorkspaceId: state.selectedWorkspaceId,
      }),
    }
  )
);
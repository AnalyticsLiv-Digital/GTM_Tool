import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GtmContainer,
  GtmTag,
  GtmTemplate,
  GtmTrigger,
  GtmVariable,
  GtmWorkspace,
} from "@/lib/gtm/types";

type ModalMode = "create" | "edit";

interface DashboardStore {
  searchQuery: string;
  workspaceModalMode: string;

  // Selected IDs
  selectedAccountId: string;
  selectedContainerId: string;
  selectedWorkspaceId: string;

  // Selected names — persisted so the navbar reads correctly across reloads.
  selectedAccountName: string;
  selectedContainerName: string;
  selectedWorkspaceName: string;

  selectedTagId: string;
  selectedTriggerId: string;
  selectedVariableId: string;
  selectedTemplateId: string;

  setSelectedAccountId: (id: string) => void;
  setSelectedContainerId: (id: string) => void;
  setSelectedWorkspaceId: (id: string) => void;

  setSelectedAccountName: (name: string) => void;
  setSelectedContainerName: (name: string) => void;
  setSelectedWorkspaceName: (name: string) => void;

  setSelectedTagId: (id: string) => void;
  setSelectedTriggerId: (id: string) => void;
  setSelectedVariableId: (id: string) => void;
  setSelectedTemplateId: (id: string) => void;

  // Data
  containers: GtmContainer[];
  workspaces: GtmWorkspace[];
  tags: GtmTag[];
  triggers: GtmTrigger[];
  variables: GtmVariable[];
  templates: GtmTemplate[];

  // Loading & errors
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

  setContainers: (data: GtmContainer[]) => void;
  setWorkspaces: (data: GtmWorkspace[]) => void;
  setTags: (data: GtmTag[]) => void;
  setTriggers: (data: GtmTrigger[]) => void;
  setVariables: (data: GtmVariable[]) => void;
  setTemplates: (data: GtmTemplate[]) => void;

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

  // Container modal
  showContainerModal: boolean;
  containerModalMode: ModalMode;
  containerNameInput: string;
  containerCrudLoading: boolean;
  setShowContainerModal: (val: boolean) => void;
  setContainerModalMode: (mode: ModalMode) => void;
  setContainerNameInput: (val: string) => void;
  setContainerCrudLoading: (val: boolean) => void;

  // Workspace modal
  showWorkspaceModal: boolean;
  workspaceNameInput: string;
  workspaceCrudLoading: boolean;
  setShowWorkspaceModal: (val: boolean) => void;
  setWorkspaceNameInput: (val: string) => void;
  setWorkspaceCrudLoading: (val: boolean) => void;

  // Tag modal
  showTagModal: boolean;
  tagModalMode: ModalMode;
  tagNameInput: string;
  tagCrudLoading: boolean;
  setShowTagModal: (val: boolean) => void;
  setTagModalMode: (mode: ModalMode) => void;
  setTagNameInput: (val: string) => void;
  setTagCrudLoading: (val: boolean) => void;

  // Trigger modal
  showTriggerModal: boolean;
  triggerModalMode: ModalMode;
  triggerNameInput: string;
  triggerCrudLoading: boolean;
  setShowTriggerModal: (val: boolean) => void;
  setTriggerModalMode: (mode: ModalMode) => void;
  setTriggerNameInput: (val: string) => void;
  setTriggerCrudLoading: (val: boolean) => void;

  // Variable modal
  showVariableModal: boolean;
  variableModalMode: ModalMode;
  variableNameInput: string;
  variableCrudLoading: boolean;
  setShowVariableModal: (val: boolean) => void;
  setVariableModalMode: (mode: ModalMode) => void;
  setVariableNameInput: (val: string) => void;
  setVariableCrudLoading: (val: boolean) => void;

  // Template modal
  showTemplateModal: boolean;
  templateModalMode: ModalMode;
  templateNameInput: string;
  templateCrudLoading: boolean;
  setShowTemplateModal: (val: boolean) => void;
  setTemplateModalMode: (mode: ModalMode) => void;
  setTemplateNameInput: (val: string) => void;
  setTemplateCrudLoading: (val: boolean) => void;

  // Unified selection modal (navbar popup)
  showSelectionModal: boolean;
  setShowSelectionModal: (val: boolean) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      workspaceModalMode: "create",

      selectedAccountId: "",
      selectedContainerId: "",
      selectedWorkspaceId: "",
      selectedAccountName: "",
      selectedContainerName: "",
      selectedWorkspaceName: "",

      selectedTagId: "",
      selectedTriggerId: "",
      selectedVariableId: "",
      selectedTemplateId: "",

      setSelectedAccountId: (id) =>
        set({
          selectedAccountId: id,
          selectedContainerId: "",
          selectedWorkspaceId: "",
          selectedContainerName: "",
          selectedWorkspaceName: "",
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
          selectedWorkspaceName: "",
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

      setSelectedAccountName: (name) => set({ selectedAccountName: name }),
      setSelectedContainerName: (name) => set({ selectedContainerName: name }),
      setSelectedWorkspaceName: (name) => set({ selectedWorkspaceName: name }),

      setSelectedTagId: (id) => set({ selectedTagId: id }),
      setSelectedTriggerId: (id) => set({ selectedTriggerId: id }),
      setSelectedVariableId: (id) => set({ selectedVariableId: id }),
      setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),

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

      showContainerModal: false,
      containerModalMode: "create",
      containerNameInput: "",
      containerCrudLoading: false,
      setShowContainerModal: (val) => set({ showContainerModal: val }),
      setContainerModalMode: (mode) => set({ containerModalMode: mode }),
      setContainerNameInput: (val) => set({ containerNameInput: val }),
      setContainerCrudLoading: (val) => set({ containerCrudLoading: val }),

      showWorkspaceModal: false,
      workspaceNameInput: "",
      workspaceCrudLoading: false,
      setShowWorkspaceModal: (val) => set({ showWorkspaceModal: val }),
      setWorkspaceNameInput: (val) => set({ workspaceNameInput: val }),
      setWorkspaceCrudLoading: (val) => set({ workspaceCrudLoading: val }),

      showTagModal: false,
      tagModalMode: "create",
      tagNameInput: "",
      tagCrudLoading: false,
      setShowTagModal: (val) => set({ showTagModal: val }),
      setTagModalMode: (mode) => set({ tagModalMode: mode }),
      setTagNameInput: (val) => set({ tagNameInput: val }),
      setTagCrudLoading: (val) => set({ tagCrudLoading: val }),

      showTriggerModal: false,
      triggerModalMode: "create",
      triggerNameInput: "",
      triggerCrudLoading: false,
      setShowTriggerModal: (val) => set({ showTriggerModal: val }),
      setTriggerModalMode: (mode) => set({ triggerModalMode: mode }),
      setTriggerNameInput: (val) => set({ triggerNameInput: val }),
      setTriggerCrudLoading: (val) => set({ triggerCrudLoading: val }),

      showVariableModal: false,
      variableModalMode: "create",
      variableNameInput: "",
      variableCrudLoading: false,
      setShowVariableModal: (val) => set({ showVariableModal: val }),
      setVariableModalMode: (mode) => set({ variableModalMode: mode }),
      setVariableNameInput: (val) => set({ variableNameInput: val }),
      setVariableCrudLoading: (val) => set({ variableCrudLoading: val }),

      showTemplateModal: false,
      templateModalMode: "create",
      templateNameInput: "",
      templateCrudLoading: false,
      setShowTemplateModal: (val) => set({ showTemplateModal: val }),
      setTemplateModalMode: (mode) => set({ templateModalMode: mode }),
      setTemplateNameInput: (val) => set({ templateNameInput: val }),
      setTemplateCrudLoading: (val) => set({ templateCrudLoading: val }),

      showSelectionModal: false,
      setShowSelectionModal: (val) => set({ showSelectionModal: val }),
    }),
    {
      name: "gtm-dashboard-store",
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        selectedContainerId: state.selectedContainerId,
        selectedWorkspaceId: state.selectedWorkspaceId,
        selectedAccountName: state.selectedAccountName,
        selectedContainerName: state.selectedContainerName,
        selectedWorkspaceName: state.selectedWorkspaceName,
      }),
    }
  )
);

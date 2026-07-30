/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { notify } from "@/lib/ui/notify";
import { confirmDialog } from "@/lib/ui/dialog";

export function useDashboardActions() {
  const store = useDashboardStore();

  // -----------------------------
  // FETCH CONTAINERS
  // -----------------------------

  const fetchContainers = async () => {
    if (!store.selectedAccountId) return;

    try {
      const response = await fetch(
        `/api/auth/gtm/containers?accountId=${store.selectedAccountId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch containers");
      }

      const data = await response.json();

      store.setContainers(data.container || []);
    } catch (error) {
      console.error("Error fetching containers:", error);
      store.setContainers([]);
    }
  };

  // -----------------------------
  // FETCH WORKSPACES
  // -----------------------------

  const fetchWorkspaces = async () => {
    const state = useDashboardStore.getState();

    if (
      !state.selectedAccountId ||
      !state.selectedContainerId
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/auth/gtm/workspaces?accountId=${state.selectedAccountId}&containerId=${state.selectedContainerId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }

      const data = await response.json();

      console.log("Workspace API response:", data);

      state.setWorkspaces(data.workspace || []);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      state.setWorkspaces([]);
    }
  };

  const fetchTags = async () => {
    const state =
      useDashboardStore.getState();

    if (state.isImportedJson) {
      return;
    }
    const { selectedAccountId, selectedContainerId, selectedWorkspaceId } =
      useDashboardStore.getState();

    if (!selectedAccountId || !selectedContainerId || !selectedWorkspaceId) return;

    try {
      useDashboardStore.getState().setTagsLoading(true);
      useDashboardStore.getState().setTagsError("");

      // ✅ Auto load triggers if not already loaded
      if (
        !useDashboardStore.getState().triggers ||
        useDashboardStore.getState().triggers.length === 0
      ) {
        await fetchTriggers();
      }

      const res = await fetch(
        `/api/auth/gtm/tags?accountId=${selectedAccountId}&containerId=${selectedContainerId}&workspaceId=${selectedWorkspaceId}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch tags");
      }

      useDashboardStore.getState().setTags(data.tag || []);
    } catch (err: any) {
      useDashboardStore.getState().setTagsError(err.message);
    } finally {
      useDashboardStore.getState().setTagsLoading(false);
    }
  };
  // -----------------------------
  // FETCH TRIGGERS
  // -----------------------------
  const fetchTriggers = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return;

    try {
      store.setTriggersLoading(true);
      store.setTriggersError("");

      const res = await fetch(
        `/api/auth/gtm/triggers?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch triggers");

      store.setTriggers(data.trigger || []);
    } catch (err: any) {
      store.setTriggersError(err.message);
    } finally {
      store.setTriggersLoading(false);
    }
  };

  // -----------------------------
  // FETCH VARIABLES
  // -----------------------------
  const fetchVariables = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return;

    try {
      store.setVariablesLoading(true);
      store.setVariablesError("");

      const res = await fetch(
        `/api/auth/gtm/variables?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch variables");

      store.setVariables(data.variable || []);
    } catch (err: any) {
      store.setVariablesError(err.message);
    } finally {
      store.setVariablesLoading(false);
    }
  };

  // -----------------------------
  // FETCH ALL WORKSPACE DATA
  // -----------------------------
  const fetchWorkspaceData = async () => {
    await fetchTags();
    await fetchTriggers();
    await fetchVariables();
    await fetchTemplates();
  };

  // ============================================================
  // CONTAINER CRUD
  // ============================================================

  const openCreateContainerModal = () => {
    store.setContainerModalMode("create");
    store.setContainerNameInput("");
    store.setShowContainerModal(true);
  };

  const openEditContainerModal = () => {
    const selected = store.containers.find(
      (c: any) => c.containerId === store.selectedContainerId
    );

    if (!selected) {
      notify.warning("Select container first");
      return;
    }

    store.setContainerModalMode("edit");
    store.setContainerNameInput(selected.name || "");
    store.setShowContainerModal(true);
  };

  const handleSaveContainer = async () => {
    if (!store.selectedAccountId) {
      notify.warning("Select account first");
      return;
    }
    if (!store.containerNameInput.trim()) {
      notify.warning("Container name required");
      return;
    }

    try {
      store.setContainerCrudLoading(true);

      if (store.containerModalMode === "create") {
        const res = await fetch("/api/auth/gtm/containers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            name: store.containerNameInput.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to create container");
      }

      if (store.containerModalMode === "edit") {
        const res = await fetch("/api/auth/gtm/containers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            name: store.containerNameInput.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update container");
      }

      store.setShowContainerModal(false);
      await fetchContainers();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setContainerCrudLoading(false);
    }
  };

  const handleDeleteContainer = async () => {
    if (!store.selectedAccountId || !store.selectedContainerId) {
      notify.warning("Select account and container first");
      return;
    }

    const ok = await confirmDialog({
      title: "Delete this container?",
      description: "This will permanently remove the container and all its workspaces, tags, triggers, and variables. This cannot be undone.",
      danger: true,
      confirmLabel: "Delete container",
    });
    if (!ok) return;

    try {
      store.setContainerCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/containers?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete container");

      store.setSelectedContainerId("");
      store.setSelectedWorkspaceId("");

      store.setWorkspaces([]);
      store.setTags([]);
      store.setTriggers([]);
      store.setVariables([]);

      await fetchContainers();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setContainerCrudLoading(false);
    }
  };

  // ============================================================
  // WORKSPACE CRUD (MAX 3 rule)
  // ============================================================

  const openCreateWorkspaceModal = () => {
    if (store.workspaces.length >= 3) {
      notify.warning("You can only create up to 3 workspaces.");
      return;
    }

    store.setWorkspaceNameInput("");
    store.setShowWorkspaceModal(true);
  };

  const handleSaveWorkspace = async () => {
    if (!store.selectedAccountId || !store.selectedContainerId) {
      notify.warning("Select account and container first");
      return;
    }

    if (!store.workspaceNameInput.trim()) {
      notify.warning("Workspace name required");
      return;
    }

    if (store.workspaces.length >= 3) {
      notify.warning("You can only create up to 3 workspaces.");
      return;
    }

    try {
      store.setWorkspaceCrudLoading(true);

      const res = await fetch("/api/auth/gtm/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: store.selectedAccountId,
          containerId: store.selectedContainerId,
          name: store.workspaceNameInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create workspace");

      store.setShowWorkspaceModal(false);
      store.setWorkspaceNameInput("");
      await fetchWorkspaces();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setWorkspaceCrudLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!store.selectedWorkspaceId) {
      notify.warning("Select a workspace first");
      return;
    }

    try {
      const confirmed = await confirmDialog({
        title: "Delete this workspace?",
        description: "This will permanently remove the workspace and all its tags, triggers, variables, and templates. This cannot be undone.",
        //tone: "destructive",
        confirmLabel: "Delete workspace",
      });

      if (!confirmed) return;

      store.setWorkspaceCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/workspaces?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete workspace");

      store.setSelectedWorkspaceId("");
      store.setSelectedWorkspaceName("");
      await fetchWorkspaces();
      notify.success("Workspace deleted successfully");
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setWorkspaceCrudLoading(false);
    }
  };

  // ============================================================
  // TAG CRUD
  // ============================================================

  const openCreateTagModal = () => {
    store.setTagModalMode("create");
    store.setTagNameInput("");
    store.setSelectedTagId("");
    store.setShowTagModal(true);
  };

  const openEditTagModal = () => {
    const tag = store.tags.find((t: any) => t.tagId === store.selectedTagId);
    if (!tag) {
      notify.warning("Select a tag first");
      return;
    }

    store.setTagModalMode("edit");
    store.setTagNameInput(tag.name || "");
    store.setShowTagModal(true);
  };

  const handleSaveTag = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!store.tagNameInput.trim()) {
      notify.warning("Tag name required");
      return;
    }

    try {
      store.setTagCrudLoading(true);

      if (store.tagModalMode === "create") {
        const res = await fetch("/api/auth/gtm/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            tag: {
              name: store.tagNameInput.trim(),
              type: "html",
              parameter: [
                {
                  type: "template",
                  key: "html",
                  value: "<h1>Hello GTM</h1>",
                },
              ],
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create tag failed");
      }

      if (store.tagModalMode === "edit") {
        const res = await fetch("/api/auth/gtm/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            tagId: store.selectedTagId,
            tag: {
              name: store.tagNameInput.trim(),
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update tag failed");
      }

      store.setShowTagModal(false);
      await fetchTags();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setTagCrudLoading(false);
    }
  };

  const handleDeleteTag = async (selectedTags?: any[]) => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!selectedTags?.length) {
      notify.warning("Select a tag first");
      return;
    }

    const tag = selectedTags[0]; // first selected tag

    const ok = await confirmDialog({
      title: "Delete this tag?",
      description:
        "The tag will be removed from this workspace. This cannot be undone.",
      danger: true,
      confirmLabel: "Delete tag",
    });

    if (!ok) return;

    try {
      store.setTagCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/tags?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&tagId=${tag.tagId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Delete tag failed");
      }

      await fetchTags();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setTagCrudLoading(false);
    }
  };

  // ============================================================
  // TRIGGER CRUD
  // ============================================================

  const openCreateTriggerModal = () => {
    store.setTriggerModalMode("create");
    store.setTriggerNameInput("");
    store.setSelectedTriggerId("");
    store.setShowTriggerModal(true);
  };

  const openEditTriggerModal = () => {
    const trigger = store.triggers.find(
      (t: any) => t.triggerId === store.selectedTriggerId
    );

    if (!trigger) {
      notify.warning("Select a trigger first");
      return;
    }

    store.setTriggerModalMode("edit");
    store.setTriggerNameInput(trigger.name || "");
    store.setShowTriggerModal(true);
  };

  const handleSaveTrigger = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!store.triggerNameInput.trim()) {
      notify.warning("Trigger name required");
      return;
    }

    try {
      store.setTriggerCrudLoading(true);

      if (store.triggerModalMode === "create") {
        const res = await fetch("/api/auth/gtm/triggers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            trigger: {
              name: store.triggerNameInput.trim(),
              type: "pageview",
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create trigger failed");
      }

      if (store.triggerModalMode === "edit") {
        const res = await fetch("/api/auth/gtm/triggers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            triggerId: store.selectedTriggerId,
            trigger: {
              name: store.triggerNameInput.trim(),
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update trigger failed");
      }

      store.setShowTriggerModal(false);
      await fetchTriggers();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setTriggerCrudLoading(false);
    }
  };

  const handleDeleteTrigger = async (selectedTriggers?: any[]) => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!selectedTriggers?.length) {
      notify.warning("Select a trigger first");
      return;
    }

    const ok = await confirmDialog({
      title: `Delete ${selectedTriggers.length} trigger(s)?`,
      description: "This action cannot be undone.",
      danger: true,
      confirmLabel: "Delete",
    });

    if (!ok) return;

    try {
      store.setTriggerCrudLoading(true);

      await Promise.all(
        selectedTriggers.map((trigger) =>
          fetch(
            `/api/auth/gtm/triggers?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&triggerId=${trigger.triggerId}`,
            {
              method: "DELETE",
            }
          )
        )
      );

      await fetchTriggers();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setTriggerCrudLoading(false);
    }
  };

  // ============================================================
  // VARIABLE CRUD
  // ============================================================

  const openCreateVariableModal = () => {
    store.setVariableModalMode("create");
    store.setVariableNameInput("");
    store.setSelectedVariableId("");
    store.setShowVariableModal(true);
  };

  const openEditVariableModal = () => {
    const variable = store.variables.find(
      (v: any) => v.variableId === store.selectedVariableId
    );

    if (!variable) {
      notify.warning("Select a variable first");
      return;
    }

    store.setVariableModalMode("edit");
    store.setVariableNameInput(variable.name || "");
    store.setShowVariableModal(true);
  };

  const handleSaveVariable = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!store.variableNameInput.trim()) {
      notify.warning("Variable name required");
      return;
    }

    try {
      store.setVariableCrudLoading(true);

      if (store.variableModalMode === "create") {
        const res = await fetch("/api/auth/gtm/variables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            variable: {
              name: store.variableNameInput.trim(),
              type: "jsm",
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create variable failed");
      }

      if (store.variableModalMode === "edit") {
        const res = await fetch("/api/auth/gtm/variables", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            variableId: store.selectedVariableId,
            variable: {
              name: store.variableNameInput.trim(),
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update variable failed");
      }

      store.setShowVariableModal(false);
      await fetchVariables();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setVariableCrudLoading(false);
    }
  };

  const handleDeleteVariable = async (selectedVariables?: any[]) => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!selectedVariables?.length) {
      notify.warning("Select a variable first");
      return;
    }

    const ok = await confirmDialog({
      title: `Delete ${selectedVariables.length} variable(s)?`,
      description: "This action cannot be undone.",
      danger: true,
      confirmLabel: "Delete",
    });

    if (!ok) return;

    try {
      store.setVariableCrudLoading(true);

      await Promise.all(
        selectedVariables.map((variable) =>
          fetch(
            `/api/auth/gtm/variables?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&variableId=${variable.variableId}`,
            {
              method: "DELETE",
            }
          )
        )
      );

      await fetchVariables();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setVariableCrudLoading(false);
    }
  };
  // -----------------------------
  // FETCH TEMPLATES
  // -----------------------------
  const fetchTemplates = async () => {
    const state = useDashboardStore.getState();

    // JSON Import Mode
    if (state.isImportedJson) {
      return;
    }

    if (
      !state.selectedAccountId ||
      !state.selectedContainerId ||
      !state.selectedWorkspaceId
    ) {
      return;
    }

    try {
      store.setTemplatesLoading(true);
      store.setTemplatesError("");

      const res = await fetch(
        `/api/auth/gtm/templates/export?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch templates");

      store.setTemplates(data.template || []);
    } catch (err: any) {
      store.setTemplatesError(err.message);
    } finally {
      store.setTemplatesLoading(false);
    }
  };

  // ============================================================
  // TEMPLATE CRUD
  // ============================================================

  const handleSaveTemplate = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!store.templateNameInput.trim()) {
      notify.warning("Template name required");
      return;
    }

    try {
      store.setTemplateCrudLoading(true);

      if (store.templateModalMode === "create") {
        const res = await fetch("/api/auth/gtm/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            template: {
              name: store.templateNameInput.trim(),
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Create template failed");
      }

      if (store.templateModalMode === "edit") {
        const res = await fetch("/api/auth/gtm/templates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: store.selectedAccountId,
            containerId: store.selectedContainerId,
            workspaceId: store.selectedWorkspaceId,
            templateId: store.selectedTemplateId,
            template: {
              name: store.templateNameInput.trim(),
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Update template failed");
      }

      store.setShowTemplateModal(false);
      store.setTemplateNameInput("");
      await fetchTemplates();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setTemplateCrudLoading(false);
    }
  };

  const handleDeleteTemplate = async (selectedTemplates?: any[]) => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    ) {
      notify.warning("Select a workspace first");
      return;
    }

    if (!selectedTemplates?.length) {
      notify.warning("Select a template first");
      return;
    }

    const ok = await confirmDialog({
      title: `Delete ${selectedTemplates.length} template(s)?`,
      description: "This action cannot be undone.",
      danger: true,
      confirmLabel: "Delete",
    });

    if (!ok) return;

    try {
      store.setTemplateCrudLoading(true);

      await Promise.all(
        selectedTemplates.map((template) =>
          fetch(
            `/api/auth/gtm/templates?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&templateId=${template.templateId}`,
            {
              method: "DELETE",
            }
          )
        )
      );

      await fetchTemplates();
    } catch (err: any) {
      notify.error(err.message);
    } finally {
      store.setTemplateCrudLoading(false);
    }
  };

  return {
    // fetch
    fetchContainers,
    fetchWorkspaces,
    fetchTags,
    fetchTriggers,
    fetchVariables,
    fetchWorkspaceData,

    // container crud
    openCreateContainerModal,
    openEditContainerModal,
    handleSaveContainer,
    handleDeleteContainer,

    // workspace crud
    openCreateWorkspaceModal,
    handleSaveWorkspace,
    handleDeleteWorkspace,

    // tags crud
    openCreateTagModal,
    openEditTagModal,
    handleSaveTag,
    handleDeleteTag,

    // triggers crud
    openCreateTriggerModal,
    openEditTriggerModal,
    handleSaveTrigger,
    handleDeleteTrigger,

    // variables crud
    openCreateVariableModal,
    openEditVariableModal,
    handleSaveVariable,
    handleDeleteVariable,

    // templates
    fetchTemplates,
    handleSaveTemplate,
    handleDeleteTemplate,
  };
} 
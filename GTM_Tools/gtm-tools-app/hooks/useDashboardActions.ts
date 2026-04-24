/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";

export function useDashboardActions() {
  const store = useDashboardStore();

  // -----------------------------
  // FETCH CONTAINERS
  // -----------------------------
  const fetchContainers = async () => {
    if (!store.selectedAccountId) return;

    try {
      store.setContainersLoading(true);
      store.setContainersError("");

      const res = await fetch(
        `/api/auth/gtm/containers?accountId=${store.selectedAccountId}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch containers");

      store.setContainers(data.container || []);
    } catch (err: any) {
      store.setContainersError(err.message);
    } finally {
      store.setContainersLoading(false);
    }
  };

  // -----------------------------
  // FETCH WORKSPACES
  // -----------------------------
  const fetchWorkspaces = async () => {
    if (!store.selectedAccountId || !store.selectedContainerId) return;

    try {
      store.setWorkspacesLoading(true);
      store.setWorkspacesError("");

      const res = await fetch(
        `/api/auth/gtm/workspaces?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch workspaces");

      store.setWorkspaces(data.workspace || []);
    } catch (err: any) {
      store.setWorkspacesError(err.message);
    } finally {
      store.setWorkspacesLoading(false);
    }
  };

  // -----------------------------
  // FETCH TAGS
  // -----------------------------
  const fetchTags = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return;

    try {
      store.setTagsLoading(true);
      store.setTagsError("");

      const res = await fetch(
        `/api/auth/gtm/tags?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch tags");

      store.setTags(data.tag || []);
    } catch (err: any) {
      store.setTagsError(err.message);
    } finally {
      store.setTagsLoading(false);
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

    if (!selected) return alert("Select container first");

    store.setContainerModalMode("edit");
    store.setContainerNameInput(selected.name || "");
    store.setShowContainerModal(true);
  };

  const handleSaveContainer = async () => {
    if (!store.selectedAccountId) return alert("Select account first");
    if (!store.containerNameInput.trim()) return alert("Container name required");

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
      alert(err.message);
    } finally {
      store.setContainerCrudLoading(false);
    }
  };

  const handleDeleteContainer = async () => {
    if (!store.selectedAccountId || !store.selectedContainerId)
      return alert("Select account and container first");

    if (!confirm("Delete this container?")) return;

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
      alert(err.message);
    } finally {
      store.setContainerCrudLoading(false);
    }
  };

  // ============================================================
  // WORKSPACE CRUD (MAX 3 rule)
  // ============================================================

  const openCreateWorkspaceModal = () => {
    if (store.workspaces.length >= 3)
      return alert("You can only create maximum 3 workspaces.");

    store.setWorkspaceNameInput("");
    store.setShowWorkspaceModal(true);
  };

  const handleSaveWorkspace = async () => {
    if (!store.selectedAccountId || !store.selectedContainerId)
      return alert("Select account and container first");

    if (!store.workspaceNameInput.trim())
      return alert("Workspace name required");

    if (store.workspaces.length >= 3)
      return alert("You can only create maximum 3 workspaces.");

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
      alert(err.message);
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
    if (!tag) return alert("Select tag first");

    store.setTagModalMode("edit");
    store.setTagNameInput(tag.name || "");
    store.setShowTagModal(true);
  };

  const handleSaveTag = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.tagNameInput.trim()) return alert("Tag name required");

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
      alert(err.message);
    } finally {
      store.setTagCrudLoading(false);
    }
  };

  const handleDeleteTag = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.selectedTagId) return alert("Select tag first");

    if (!confirm("Delete this tag?")) return;

    try {
      store.setTagCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/tags?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&tagId=${store.selectedTagId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete tag failed");

      store.setSelectedTagId("");
      await fetchTags();
    } catch (err: any) {
      alert(err.message);
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

    if (!trigger) return alert("Select trigger first");

    store.setTriggerModalMode("edit");
    store.setTriggerNameInput(trigger.name || "");
    store.setShowTriggerModal(true);
  };

  const handleSaveTrigger = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.triggerNameInput.trim())
      return alert("Trigger name required");

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
      alert(err.message);
    } finally {
      store.setTriggerCrudLoading(false);
    }
  };

  const handleDeleteTrigger = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.selectedTriggerId) return alert("Select trigger first");

    if (!confirm("Delete this trigger?")) return;

    try {
      store.setTriggerCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/triggers?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&triggerId=${store.selectedTriggerId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete trigger failed");

      store.setSelectedTriggerId("");
      await fetchTriggers();
    } catch (err: any) {
      alert(err.message);
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

    if (!variable) return alert("Select variable first");

    store.setVariableModalMode("edit");
    store.setVariableNameInput(variable.name || "");
    store.setShowVariableModal(true);
  };

  const handleSaveVariable = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.variableNameInput.trim())
      return alert("Variable name required");

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
      alert(err.message);
    } finally {
      store.setVariableCrudLoading(false);
    }
  };

  const handleDeleteVariable = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.selectedVariableId) return alert("Select variable first");

    if (!confirm("Delete this variable?")) return;

    try {
      store.setVariableCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/variables?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&variableId=${store.selectedVariableId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete variable failed");

      store.setSelectedVariableId("");
      await fetchVariables();
    } catch (err: any) {
      alert(err.message);
    } finally {
      store.setVariableCrudLoading(false);
    }
  };
  // -----------------------------
  // FETCH TEMPLATES
  // -----------------------------
  const fetchTemplates = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return;

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
    )
      return alert("Select workspace first");

    if (!store.templateNameInput.trim())
      return alert("Template name required");

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
      alert(err.message);
    } finally {
      store.setTemplateCrudLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (
      !store.selectedAccountId ||
      !store.selectedContainerId ||
      !store.selectedWorkspaceId
    )
      return alert("Select workspace first");

    if (!store.selectedTemplateId)
      return alert("Select template first");

    if (!confirm("Delete this template?")) return;

    try {
      store.setTemplateCrudLoading(true);

      const res = await fetch(
        `/api/auth/gtm/templates?accountId=${store.selectedAccountId}&containerId=${store.selectedContainerId}&workspaceId=${store.selectedWorkspaceId}&templateId=${store.selectedTemplateId}`,
        { method: "DELETE" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete template failed");

      store.setSelectedTemplateId("");
      await fetchTemplates();
    } catch (err: any) {
      alert(err.message);
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
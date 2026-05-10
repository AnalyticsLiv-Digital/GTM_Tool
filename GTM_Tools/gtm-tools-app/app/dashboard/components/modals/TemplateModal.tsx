"use client";

import { useRef } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { Modal } from "@/components/ui/Modal";

export default function TemplateModal() {
  const store = useDashboardStore();
  const { handleSaveTemplate, handleDeleteTemplate, fetchTemplates } =
    useDashboardActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditMode = store.templateModalMode === "edit";
  const close = () => {
    store.setShowTemplateModal(false);
    store.setTemplateNameInput("");
  };

  const saveLabel = store.templateCrudLoading
    ? isEditMode
      ? "Updating…"
      : "Creating…"
    : isEditMode
    ? "Update template"
    : "Create template";

  return (
    <Modal
      open={store.showTemplateModal}
      onClose={close}
      size="md"
      title={isEditMode ? "Edit template" : "Create template"}
      initialFocusRef={inputRef}
      footer={
        <div className="flex w-full items-center justify-between">
          {isEditMode ? (
            <button
              type="button"
              onClick={async () => {
                await handleDeleteTemplate();
                await fetchTemplates();
              }}
              disabled={store.templateCrudLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 text-[color:var(--danger)] hover:bg-[color:var(--danger)]/15 disabled:opacity-50"
            >
              {store.templateCrudLoading ? "Deleting…" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={close} className="btn-secondary !py-1.5 !px-3">
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleSaveTemplate();
                await fetchTemplates();
              }}
              disabled={store.templateCrudLoading}
              className="btn-primary !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveLabel}
            </button>
          </div>
        </div>
      }
    >
      <div>
        <label htmlFor="template-name" className="block text-[12.5px] font-medium text-fg mb-2">
          Template name
        </label>
        <input
          id="template-name"
          ref={inputRef}
          type="text"
          value={store.templateNameInput}
          onChange={(e) => store.setTemplateNameInput(e.target.value)}
          placeholder="Enter template name"
          className="w-full bg-page-soft"
        />
      </div>
    </Modal>
  );
}

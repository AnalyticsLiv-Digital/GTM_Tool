"use client";

import { useRef } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { Modal } from "@/components/ui/Modal";

export default function TagModal() {
  const {
    showTagModal,
    setShowTagModal,
    tagModalMode,
    tagNameInput,
    setTagNameInput,
    tagCrudLoading,
    selectedWorkspaceId,
  } = useDashboardStore();

  const { handleSaveTag } = useDashboardActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => setShowTagModal(false);

  return (
    <Modal
      open={showTagModal}
      onClose={close}
      size="md"
      title={tagModalMode === "create" ? "Create tag" : "Edit tag"}
      initialFocusRef={inputRef}
      footer={
        selectedWorkspaceId ? (
          <>
            <button type="button" onClick={close} className="btn-secondary py-1.5! px-3!">
              Cancel
            </button>
            <button
              type="button"
              disabled={tagCrudLoading}
              onClick={handleSaveTag}
              className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tagCrudLoading ? "Saving…" : "Save tag"}
            </button>
          </>
        ) : null
      }
    >
      {!selectedWorkspaceId ? (
        <p className="text-sm text-muted">Please select a workspace first.</p>
      ) : (
        <div>
          <label htmlFor="tag-name" className="block text-[12.5px] font-medium text-fg mb-2">
            Tag name
          </label>
          <input
            id="tag-name"
            ref={inputRef}
            value={tagNameInput}
            onChange={(e) => setTagNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !tagCrudLoading) handleSaveTag();
            }}
            placeholder="Enter tag name"
            className="w-full bg-page-soft"
          />
        </div>
      )}
    </Modal>
  );
}

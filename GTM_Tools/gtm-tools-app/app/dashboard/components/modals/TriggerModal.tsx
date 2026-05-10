"use client";

import { useRef } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { Modal } from "@/components/ui/Modal";

export default function TriggerModal() {
  const {
    showTriggerModal,
    setShowTriggerModal,
    triggerModalMode,
    triggerNameInput,
    setTriggerNameInput,
    triggerCrudLoading,
    selectedWorkspaceId,
  } = useDashboardStore();

  const { handleSaveTrigger } = useDashboardActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => setShowTriggerModal(false);

  return (
    <Modal
      open={showTriggerModal}
      onClose={close}
      size="md"
      title={triggerModalMode === "create" ? "Create trigger" : "Edit trigger"}
      initialFocusRef={inputRef}
      footer={
        selectedWorkspaceId ? (
          <>
            <button type="button" onClick={close} className="btn-secondary !py-1.5 !px-3">
              Cancel
            </button>
            <button
              type="button"
              disabled={triggerCrudLoading}
              onClick={handleSaveTrigger}
              className="btn-primary !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggerCrudLoading ? "Saving…" : "Save trigger"}
            </button>
          </>
        ) : null
      }
    >
      {!selectedWorkspaceId ? (
        <p className="text-sm text-muted">Please select a workspace first.</p>
      ) : (
        <div>
          <label htmlFor="trigger-name" className="block text-[12.5px] font-medium text-fg mb-2">
            Trigger name
          </label>
          <input
            id="trigger-name"
            ref={inputRef}
            value={triggerNameInput}
            onChange={(e) => setTriggerNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !triggerCrudLoading) handleSaveTrigger();
            }}
            placeholder="Enter trigger name"
            className="w-full bg-page-soft"
          />
        </div>
      )}
    </Modal>
  );
}

"use client";

import { useRef } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { Modal } from "@/components/ui/Modal";

export default function VariableModal() {
  const {
    showVariableModal,
    setShowVariableModal,
    variableModalMode,
    variableNameInput,
    setVariableNameInput,
    variableCrudLoading,
    selectedWorkspaceId,
  } = useDashboardStore();

  const { handleSaveVariable } = useDashboardActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => setShowVariableModal(false);

  return (
    <Modal
      open={showVariableModal}
      onClose={close}
      size="md"
      title={variableModalMode === "create" ? "Create variable" : "Edit variable"}
      initialFocusRef={inputRef}
      footer={
        selectedWorkspaceId ? (
          <>
            <button type="button" onClick={close} className="btn-secondary !py-1.5 !px-3">
              Cancel
            </button>
            <button
              type="button"
              disabled={variableCrudLoading}
              onClick={handleSaveVariable}
              className="btn-primary !py-1.5 !px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {variableCrudLoading ? "Saving…" : "Save variable"}
            </button>
          </>
        ) : null
      }
    >
      {!selectedWorkspaceId ? (
        <p className="text-sm text-muted">Please select a workspace first.</p>
      ) : (
        <div>
          <label htmlFor="variable-name" className="block text-[12.5px] font-medium text-fg mb-2">
            Variable name
          </label>
          <input
            id="variable-name"
            ref={inputRef}
            value={variableNameInput}
            onChange={(e) => setVariableNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !variableCrudLoading) handleSaveVariable();
            }}
            placeholder="Enter variable name"
            className="w-full bg-page-soft"
          />
        </div>
      )}
    </Modal>
  );
}

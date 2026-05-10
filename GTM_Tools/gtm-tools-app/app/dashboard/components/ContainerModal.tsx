"use client";

import { useRef } from "react";
import { Modal } from "@/components/ui/Modal";

interface ContainerModalProps {
  show: boolean;
  mode: "create" | "edit";
  name: string;
  setName: (name: string) => void;
  loading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ContainerModal({
  show,
  mode,
  name,
  setName,
  loading,
  onClose,
  onSave,
}: ContainerModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Modal
      open={show}
      onClose={onClose}
      size="md"
      title={mode === "create" ? "Create container" : "Edit container"}
      initialFocusRef={inputRef}
      footer={
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="btn-secondary !py-1.5 !px-3 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onSave}
            className="btn-primary !py-1.5 !px-3 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save container"}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor="container-name" className="block text-[12.5px] font-medium text-fg mb-2">
          Container name
        </label>
        <input
          id="container-name"
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) onSave();
          }}
          placeholder="Enter container name"
          className="w-full bg-page-soft"
        />
      </div>
    </Modal>
  );
}

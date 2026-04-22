"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

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

  if (!showTagModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {tagModalMode === "create" ? "Create Tag" : "Edit Tag"}
          </h2>

          <button
            onClick={() => setShowTagModal(false)}
            className="text-gray-600 hover:text-gray-900 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        {!selectedWorkspaceId ? (
          <p className="text-sm text-gray-600">
            Please select a workspace first.
          </p>
        ) : (
          <>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tag Name
            </label>

            <input
              value={tagNameInput}
              onChange={(e) => setTagNameInput(e.target.value)}
              placeholder="Enter tag name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* FOOTER BUTTONS */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                disabled={tagCrudLoading}
                onClick={handleSaveTag}
                className={`px-4 py-2 text-sm font-semibold rounded-xl ${
                  tagCrudLoading
                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {tagCrudLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
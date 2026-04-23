 
"use client";

import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";

export default function TemplateModal() {
  const store = useDashboardStore();
  const {
    handleSaveTemplate,
    handleDeleteTemplate,
    fetchTemplates,
  } = useDashboardActions();

  if (!store.showTemplateModal) return null;

  const isEditMode = store.templateModalMode === "edit";

  const closeModal = () => {
    store.setShowTemplateModal(false);
    store.setTemplateNameInput("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? "Edit Template" : "Create Template"}
          </h2>

          <button
            onClick={closeModal}
            className="text-gray-500 hover:text-gray-800 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* INPUT */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700">
            Template Name
          </label>

          <input
            type="text"
            value={store.templateNameInput}
            onChange={(e) => store.setTemplateNameInput(e.target.value)}
            placeholder="Enter template name"
            className="w-full mt-2 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* BUTTONS */}
        <div className="flex justify-between items-center mt-6">
          {/* DELETE BUTTON ONLY IN EDIT MODE */}
          {isEditMode ? (
            <button
              onClick={async () => {
                await handleDeleteTemplate();
                await fetchTemplates();
              }}
              disabled={store.templateCrudLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {store.templateCrudLoading ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={async () => {
                await handleSaveTemplate();
                await fetchTemplates();
              }}
              disabled={store.templateCrudLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {store.templateCrudLoading
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update"
                : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
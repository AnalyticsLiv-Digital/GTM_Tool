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
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {mode === "create" ? "Create Container" : "Edit Container"}
        </h2>

        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Container Name
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter container name"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
        />

        <div className="flex justify-end gap-3 mt-6">
          <button
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 hover:bg-gray-100 disabled:bg-gray-200"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={onSave}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
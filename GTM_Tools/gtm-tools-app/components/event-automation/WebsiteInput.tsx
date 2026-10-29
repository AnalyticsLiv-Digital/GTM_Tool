"use client";

interface WebsiteInputProps {
  value: string;
  onChange: (value: string) => void;
  onInspect: () => void;
  loading?: boolean;
}

export default function WebsiteInput({
  value,
  onChange,
  onInspect,
  loading = false,
}: WebsiteInputProps) {
  return (
    <div>
      <div className="flex gap-3">
        <input
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none focus:border-(--accent)"
        />

        <button
          type="button"
          onClick={onInspect}
          disabled={
            loading ||
            !value.trim()
          }
          className="rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Inspecting..."
            : "Inspect"}
        </button>
      </div>
    </div>
  );
}
"use client";

import {
  useRef,
  useState,
} from "react";

import type {
  ParsedEventSchema,
} from "@/lib/event-automation/types";

import {
  parseSchemaFile,
} from "@/lib/event-automation/schema-parser";

interface EventSchemaUploadProps {
  onSchemaParsed: (
    schema: ParsedEventSchema
  ) => void;

  loading?: boolean;
}

export default function EventSchemaUpload({
  onSchemaParsed,
  loading = false,
}: EventSchemaUploadProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [error, setError] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setUploading(true);

    try {
      console.log(
        "[Event Automation] Uploading:",
        file.name,
        file.type,
        file.size
      );

      const schema =
        await parseSchemaFile(file);

      onSchemaParsed(schema);
    } catch (error) {
      console.error(
        "[Event Automation] Upload error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to upload Excel schema."
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h2 className="text-base font-semibold text-fg">
        1. Upload Event Schema
      </h2>

      <p className="mt-1 text-xs text-muted">
        Upload your event schema in Excel format.
      </p>

      <div className="mt-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={handleFileChange}
          disabled={
            loading ||
            uploading
          }
          className="hidden"
        />

        <button
          type="button"
          onClick={handleButtonClick}
          disabled={
            loading ||
            uploading
          }
          className="rounded-lg border border-line bg-card-hi px-4 py-2.5 text-sm font-medium text-fg transition hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? "Reading Excel..."
            : "Upload Event Schema"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-xs text-red-500">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
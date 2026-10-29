"use client";

import type {
  GA4MeasurementIdConfig,
} from "@/lib/event-automation/types";

interface GA4MeasurementIdProps {
  value: GA4MeasurementIdConfig;

  onChange: (
    value: GA4MeasurementIdConfig
  ) => void;

  disabled?: boolean;
}

export default function GA4MeasurementId({
  value,
  onChange,
  disabled = false,
}: GA4MeasurementIdProps) {
  // =====================================================
  // USE GTM VARIABLE
  // =====================================================

  const handleGTMVariable = () => {
    onChange({
      mode: "gtm_variable",
      value: "{{GA4 Measurement ID}}",
    });
  };

  // =====================================================
  // USE EXISTING MEASUREMENT ID
  // =====================================================

  const handleManual = () => {
    onChange({
      mode: "manual",
      value: "",
    });
  };

  // =====================================================
  // MANUAL INPUT
  // =====================================================

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({
      mode: "manual",
      value: event.target.value,
    });
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const manualValue = value.value.trim();

  const isManualValid =
    value.mode === "manual" &&
    /^G-[A-Z0-9]+$/i.test(manualValue);

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="rounded-xl border border-line bg-card p-5">

      {/* =================================================
          TITLE
          ================================================= */}

      <h2 className="text-base font-semibold text-fg">
        2. GA4 Measurement ID
      </h2>

      <p className="mt-1 text-xs text-muted">
        Choose how the GA4 Measurement ID should be used
        when creating the selected GA4 events in GTM.
      </p>

      <div className="mt-4 space-y-3">

        {/* =================================================
            GTM VARIABLE
            ================================================= */}

        <label
          className={`block cursor-pointer rounded-lg border p-4 ${value.mode === "gtm_variable"
              ? "border-(--accent) bg-card-hi"
              : "border-line"
            }`}
        >

          <div className="flex items-start gap-3">

            <input
              type="radio"
              name="ga4MeasurementMode"
              checked={
                value.mode === "gtm_variable"
              }
              onChange={handleGTMVariable}
              disabled={disabled}
              className="mt-1 h-4 w-4"
            />

            <div className="min-w-0">

              <p className="text-sm font-medium text-fg">
                Use GTM Variable
              </p>

              <p className="mt-1 text-xs text-muted">
                Use the existing GTM variable:
              </p>

              <code className="mt-1 block text-sm text-fg">
                {"{{GA4 Measurement ID}}"}
              </code>

            </div>

          </div>

        </label>

        {/* =================================================
            EXISTING MEASUREMENT ID
            ================================================= */}

        <label
          className={`block cursor-pointer rounded-lg border p-4 ${value.mode === "manual"
              ? "border-(--accent) bg-card-hi"
              : "border-line"
            }`}
        >

          <div className="flex items-start gap-3">

            <input
              type="radio"
              name="ga4MeasurementMode"
              checked={
                value.mode === "manual"
              }
              onChange={handleManual}
              disabled={disabled}
              className="mt-1 h-4 w-4"
            />

            <div className="min-w-0 flex-1">

              <p className="text-sm font-medium text-fg">
                Use Existing Measurement ID
              </p>

              <p className="mt-1 text-xs text-muted">
                Enter your existing GA4 Measurement ID.
              </p>

            </div>

          </div>

          {/* =================================================
              INPUT
              ================================================= */}

          <div className="mt-3 pl-7">

            <input
              type="text"
              value={
                value.mode === "manual"
                  ? value.value
                  : ""
              }
              onChange={handleInputChange}
              disabled={
                disabled ||
                value.mode !== "manual"
              }
              placeholder="G-XXXXXXXXXX"
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg outline-none transition focus:border-(--accent) disabled:cursor-not-allowed disabled:opacity-50"
            />

            {/* =================================================
                VALIDATION MESSAGE
                ================================================= */}

            {value.mode === "manual" &&
              manualValue &&
              !isManualValid && (
                <p className="mt-2 text-xs text-red-500">
                  Enter a valid GA4 Measurement ID,
                  for example G-XXXXXXXXXX.
                </p>
              )}

          </div>

        </label>

      </div>
    </div>
  );
}
"use client";

import { useState } from "react";

export type TrackingPlatform = "kp_ga4" | "meta" | "linkedin" | "tiktok";

export type PlatformConfigs = {
  kp_ga4: { measurementId: string };
  meta: { pixelId: string; accessToken: string; testEventCode: string };
  linkedin: { accessToken: string; partnerId: string; conversionRuleId: string };
  tiktok: { pixelId: string; accessToken: string; testEventCode: string };
};

export type ConnectPayload = {
  serverContainerUrl: string;
  serverMeasurementId: string;
  selectedPlatforms: TrackingPlatform[];
  platformConfigs: PlatformConfigs;
};

type Props = {
  accountId: string;
  webContainerId: string;
  webWorkspaceId: string;
  serverContainerId: string;
  serverWorkspaceId: string;
  serverContainerUrl: string;
  onServerContainerUrlChange: (url: string) => void;
  onConnect: (payload: ConnectPayload) => void;
  loading?: boolean;
};

const initialConfigs: PlatformConfigs = {
  kp_ga4: { measurementId: "" },
  meta: { pixelId: "", accessToken: "", testEventCode: "" },
  linkedin: { accessToken: "", partnerId: "", conversionRuleId: "" },
  tiktok: { pixelId: "", accessToken: "", testEventCode: "" },
};

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength ?? 5000))}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none focus:border-primary"
      />
    </label>
  );
}

export default function GtmWebServerConnection({
  accountId,
  webContainerId,
  webWorkspaceId,
  serverContainerId,
  serverWorkspaceId,
  serverContainerUrl,
  onServerContainerUrlChange,
  onConnect,
  loading = false,
}: Props) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<TrackingPlatform[]>(["kp_ga4"]);
  const [configs, setConfigs] = useState<PlatformConfigs>(initialConfigs);
  const [serverMeasurementId, setServerMeasurementId] = useState("");

  const ready = Boolean(
    accountId && webContainerId && webWorkspaceId && serverContainerId && serverWorkspaceId
  );

  function togglePlatform(platform: TrackingPlatform) {
    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  function updateConfig<K extends keyof PlatformConfigs>(
    platform: K,
    key: keyof PlatformConfigs[K],
    value: string
  ) {
    setConfigs((current) => ({
      ...current,
      [platform]: { ...current[platform], [key]: value },
    }) as PlatformConfigs);
  }

  function handleConnect() {
    onConnect({
      serverContainerUrl,
      serverMeasurementId: serverMeasurementId.slice(0, 10),
      selectedPlatforms,
      platformConfigs: {
        ...configs,
        kp_ga4: { measurementId: configs.kp_ga4.measurementId.slice(0, 10) },
      },
    });
  }

  return (
    <section className="rounded-xl border border-line bg-card p-4 md:p-5">
      <h3 className="text-sm font-semibold text-fg">Connect Web GTM to Server GTM</h3>
      <p className="mt-1 text-xs text-muted">
        Configure the selected platforms in the chosen Web and Server GTM workspaces. Changes are saved to the workspaces but are not published.
      </p>

      <div className="mt-5">
        <TextField
          label="Server Container URL"
          value={serverContainerUrl}
          onChange={onServerContainerUrlChange}
          placeholder="https://your-container.stape.io"
          type="url"
        />
        <p className="mt-1 text-[11px] text-muted">Enter the public HTTPS tagging-server origin.</p>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h4 className="text-sm font-semibold text-fg">Tracking Platforms</h4>
        <p className="mt-1 text-xs text-muted">Only selected platforms will be configured.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {([
            ["kp_ga4", "Google Analytics 4"],
            ["meta", "Meta Conversions API"],
            ["linkedin", "LinkedIn Conversions API"],
            ["tiktok", "TikTok Events API"],
          ] as [TrackingPlatform, string][]).map(([platform, label]) => (
            <label key={platform} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-3 text-xs text-fg">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Static section: always visible; values remain editable and capped at 10 characters. */}
      <div className="mt-6 border-t border-line pt-5">
        <h4 className="text-sm font-semibold text-fg">Google Analytics 4 Configuration</h4>
        <p className="mt-1 text-xs text-muted">Enter up to 10 characters. Shorter values are allowed; the field does not require exactly 10.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextField
            label="Web GA4 Measurement ID"
            value={configs.kp_ga4.measurementId}
            onChange={(value) => updateConfig("kp_ga4", "measurementId", value)}
            placeholder="Enter Web Measurement ID"
            maxLength={10}
          />
          <TextField
            label="Server GA4 Measurement ID"
            value={serverMeasurementId}
            onChange={(value) => setServerMeasurementId(value.slice(0, 10))}
            placeholder="Enter Server Measurement ID"
            maxLength={10}
          />
        </div>
      </div>

      {selectedPlatforms.includes("meta") && (
        <div className="mt-6 border-t border-line pt-5">
          <h4 className="text-sm font-semibold text-fg">Meta Configuration</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField label="Meta Pixel ID" value={configs.meta.pixelId} onChange={(v) => updateConfig("meta", "pixelId", v)} placeholder="Pixel ID (optional for initial tag creation)" />
            <TextField label="Meta Access Token" value={configs.meta.accessToken} onChange={(v) => updateConfig("meta", "accessToken", v)} placeholder="Access Token" />
            <TextField label="Test Event Code" value={configs.meta.testEventCode} onChange={(v) => updateConfig("meta", "testEventCode", v)} placeholder="Optional" />
          </div>
        </div>
      )}

      {selectedPlatforms.includes("linkedin") && (
        <div className="mt-6 border-t border-line pt-5">
          <h4 className="text-sm font-semibold text-fg">LinkedIn Configuration</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField label="Partner ID" value={configs.linkedin.partnerId} onChange={(v) => updateConfig("linkedin", "partnerId", v)} placeholder="Optional" />
            <TextField label="Access Token" value={configs.linkedin.accessToken} onChange={(v) => updateConfig("linkedin", "accessToken", v)} placeholder="Access Token" />
            <TextField label="Conversion Rule ID" value={configs.linkedin.conversionRuleId} onChange={(v) => updateConfig("linkedin", "conversionRuleId", v)} placeholder="Optional for initial tag creation" />
          </div>
        </div>
      )}

      {selectedPlatforms.includes("tiktok") && (
        <div className="mt-6 border-t border-line pt-5">
          <h4 className="text-sm font-semibold text-fg">TikTok Configuration</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField label="TikTok Pixel ID" value={configs.tiktok.pixelId} onChange={(v) => updateConfig("tiktok", "pixelId", v)} placeholder="Pixel ID (optional for initial tag creation)" />
            <TextField label="Access Token" value={configs.tiktok.accessToken} onChange={(v) => updateConfig("tiktok", "accessToken", v)} placeholder="Optional" />
            <TextField label="Test Event Code" value={configs.tiktok.testEventCode} onChange={(v) => updateConfig("tiktok", "testEventCode", v)} placeholder="Optional" />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted">
          {!ready ? "Select the Web container/workspace and Server container/workspace first." : selectedPlatforms.length === 0 ? "Select at least one tracking platform." : "Ready to configure. Nothing will be published."}
        </p>
        <button
          type="button"
          onClick={handleConnect}
          disabled={
            !ready ||
            !serverContainerUrl.trim() ||
            selectedPlatforms.length === 0 ||
            loading
          }
          className="
    inline-flex items-center justify-center
    rounded-lg
    border border-blue-700
    bg-blue-600
    px-5 py-2.5
    text-sm font-semibold text-white
    shadow-sm
    transition-all duration-200
    hover:bg-blue-700
    hover:shadow-md
    focus:outline-none
    focus:ring-2 focus:ring-blue-500
    focus:ring-offset-2
    dark:border-blue-400
    dark:bg-blue-500
    dark:text-white
    dark:hover:bg-blue-400
    dark:focus:ring-offset-slate-900
    disabled:cursor-not-allowed
    disabled:border-slate-300
    disabled:bg-slate-200
    disabled:text-slate-500
    disabled:shadow-none
    dark:disabled:border-slate-600
    dark:disabled:bg-slate-700
    dark:disabled:text-slate-400
  "
        >
          {loading ? "Configuring GTM..." : "Connect Web to Server"}
        </button>
      </div>
    </section>
  );
}

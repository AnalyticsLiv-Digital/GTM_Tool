"use client";

type Props = {
  accountId: string;
  webContainerId: string;
  webWorkspaceId: string;
  serverContainerId: string;
  serverContainerUrl: string;
  onServerContainerUrlChange: (url: string) => void;
  onConnect: () => void;
  loading?: boolean;
};

export default function GtmWebServerConnection({
  accountId,
  webContainerId,
  webWorkspaceId,
  serverContainerId,
  serverContainerUrl,
  onServerContainerUrlChange,
  onConnect,
  loading = false,
}: Props) {
  const ready =
    Boolean(accountId) &&
    Boolean(webContainerId) &&
    Boolean(webWorkspaceId) &&
    Boolean(serverContainerId);

  return (
    <div className="rounded-xl border border-line bg-card p-4 md:p-5">
      <h3 className="text-sm font-semibold text-fg">
        Connect Web GTM to Server GTM
      </h3>
      <p className="mt-1 text-xs text-muted">
        The Server Container URL is applied to the Google Tag in your selected
        Web workspace through your existing GTM automation API.
      </p>

      <label
        htmlFor="server-container-url"
        className="mt-4 block text-xs font-medium text-muted"
      >
        Server Container URL
      </label>
      <input
        id="server-container-url"
        type="url"
        value={serverContainerUrl}
        onChange={(event) => onServerContainerUrlChange(event.target.value)}
        placeholder="https://your-container.stape.io"
        autoComplete="url"
        className="mt-2 w-full rounded-lg border border-line bg-card-hi px-3 py-2.5 text-sm text-fg outline-none focus:border-primary"
      />

      <p className="mt-1.5 text-[11px] text-muted">
        Enter the public HTTPS tagging-server origin, not the Server GTM
        container ID.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-muted">
          {!ready
            ? "Select the Web container, Web workspace, and Server container first."
            : "Ready to configure the selected Web and Server containers."}
        </p>
        <button
          type="button"
          onClick={onConnect}
          disabled={!ready || !serverContainerUrl.trim() || loading}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Configuring GTM..." : "Connect Web to Server"}
        </button>
      </div>
    </div>
  );
}

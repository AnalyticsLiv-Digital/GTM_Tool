/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SelectionPanel(props: any) {
  const {
    accounts,
    accountsLoading,
    error,
    selectedAccountId,
    setSelectedAccountId,
    containers,
    containersLoading,
    containersError,
    selectedContainerId,
    setSelectedContainerId,
    workspaces,
    workspacesLoading,
    workspacesError,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    tagsLoading,
    triggersLoading,
    variablesLoading,
    tagsError,
    triggersError,
    variablesError,
    disableAccountDropdown,
    disableContainerDropdown,
    disableWorkspaceDropdown,
    openCreateContainerModal,
    openEditContainerModal,
    handleDeleteContainer,
    containerCrudLoading,
  } = props;

  const selectedAccount = accounts.find(
    (acc: any) => acc.accountId === selectedAccountId
  );

  const selectedContainer = containers.find(
    (c: any) => c.containerId === selectedContainerId
  );

  const selectedWorkspace = workspaces.find(
    (w: any) => w.workspaceId === selectedWorkspaceId
  );

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-5">GTM Selection</h2>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Accounts */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Account
          </label>

          <select
            disabled={disableAccountDropdown}
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              -- Select GTM Account --
            </option>

            {accounts.map((acc: any) => (
              <option key={acc.accountId} value={acc.accountId}>
                {acc.name}
              </option>
            ))}
          </select>

          {accountsLoading && (
            <p className="text-xs text-gray-500 mt-2">Loading accounts...</p>
          )}

          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>

        {/* Containers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              Select Container
            </label>

            <div className="flex gap-2">
              <button
                disabled={!selectedAccountId || containerCrudLoading}
                onClick={openCreateContainerModal}
                className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                + Create
              </button>

              <button
                disabled={!selectedContainerId || containerCrudLoading}
                onClick={openEditContainerModal}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Edit
              </button>

              <button
                disabled={!selectedContainerId || containerCrudLoading}
                onClick={handleDeleteContainer}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>

          <select
            disabled={disableContainerDropdown}
            value={selectedContainerId}
            onChange={(e) => setSelectedContainerId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              -- Select Container --
            </option>

            {containers.map((c: any) => (
              <option key={c.containerId} value={c.containerId}>
                {c.name}
              </option>
            ))}
          </select>

          {containersLoading && (
            <p className="text-xs text-gray-500 mt-2">
              Fetching containers...
            </p>
          )}

          {containersError && (
            <p className="text-xs text-red-600 mt-2">{containersError}</p>
          )}
        </div>

        {/* Workspaces */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Workspace
          </label>

          <select
            disabled={disableWorkspaceDropdown}
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="" disabled>
              -- Select Workspace --
            </option>

            {workspaces.map((w: any) => (
              <option key={w.workspaceId} value={w.workspaceId}>
                {w.name}
              </option>
            ))}
          </select>

          {workspacesLoading && (
            <p className="text-xs text-gray-500 mt-2">
              Fetching workspaces...
            </p>
          )}

          {workspacesError && (
            <p className="text-xs text-red-600 mt-2">{workspacesError}</p>
          )}
        </div>

        {(tagsLoading || triggersLoading || variablesLoading) && (
          <p className="text-sm text-gray-600 font-medium">
            Loading tags, triggers and variables...
          </p>
        )}

        {(tagsError || triggersError || variablesError) && (
          <p className="text-sm text-red-600 font-medium">
            {tagsError || triggersError || variablesError}
          </p>
        )}

        {selectedAccount && (
          <div className="bg-linear-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-5">
            <p className="text-sm text-gray-800">
              <span className="font-bold">Account:</span> {selectedAccount.name}
            </p>

            {selectedContainer && (
              <p className="text-sm text-gray-800 mt-2">
                <span className="font-bold">Container:</span>{" "}
                {selectedContainer.name}
              </p>
            )}

            {selectedWorkspace && (
              <p className="text-sm text-gray-800 mt-2">
                <span className="font-bold">Workspace:</span>{" "}
                {selectedWorkspace.name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
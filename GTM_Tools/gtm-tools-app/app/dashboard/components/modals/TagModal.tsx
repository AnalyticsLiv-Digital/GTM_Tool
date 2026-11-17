
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { useDashboardActions } from "@/hooks/useDashboardActions";
import { Modal } from "@/components/ui/Modal";

type Platform = "ga4" | "meta" | "linkedin" | "tiktok";

function getParameterValue(
  tag: {
    parameter?: { key?: string; value?: string }[] | null;
  } | null | undefined,
  keys: string[]
) {
  const parameters = Array.isArray(tag?.parameter) ? tag.parameter : [];

  for (const key of keys) {
    const parameter = parameters.find((item) => item.key === key);

    if (parameter?.value?.trim()) {
      return parameter.value.trim();
    }
  }

  return "";
}

export default function TagModal() {
  const store = useDashboardStore();

  const {
    showTagModal,
    setShowTagModal,
    tagModalMode,
    tagNameInput,
    setTagNameInput,
    tagCrudLoading,
    selectedWorkspaceId,
    selectedAccountId,
    selectedContainerId,
    tags,
    setTagCrudLoading,
  } = store;

  const {
    handleSaveTag,
    fetchTags,
    fetchTriggers,
  } = useDashboardActions();

  const inputRef = useRef<HTMLInputElement>(null);
  const measurementInputRef = useRef<HTMLInputElement>(null);
  const triggerInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlatforms, setSelectedPlatforms] =
    useState<Platform[]>(["ga4"]);

  // Actual Measurement ID passed to GTM.
  const [measurementId, setMeasurementId] = useState("");

  // Visible Measurement ID autocomplete input.
  const [measurementInput, setMeasurementInput] = useState("");
  const [measurementDropdownOpen, setMeasurementDropdownOpen] =
    useState(false);
  const [measurementSearch, setMeasurementSearch] = useState("");
  const [measurementCursor, setMeasurementCursor] = useState(0);

  const [eventName, setEventName] = useState("");

  // Actual GTM trigger ID.
  const [selectedTriggerId, setSelectedTriggerId] = useState("");

  // Visible trigger autocomplete input.
  const [triggerInput, setTriggerInput] = useState("");
  const [triggerDropdownOpen, setTriggerDropdownOpen] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState("");
  const [triggerCursor, setTriggerCursor] = useState(0);

  const [metaPixelId, setMetaPixelId] = useState("");
  const [linkedinPartnerId, setLinkedinPartnerId] = useState("");
  const [tiktokPixelId, setTiktokPixelId] = useState("");

  const [formError, setFormError] = useState("");

  const isCreate = tagModalMode === "create";

  const close = () => {
    setShowTagModal(false);
    setFormError("");
    setMeasurementDropdownOpen(false);
    setTriggerDropdownOpen(false);
  };

  // Extract existing GA4 Measurement IDs from Google tags.
  const existingMeasurementIds = useMemo(() => {
    const ids = new Map<string, string>();

    (tags || []).forEach((tag) => {
      if (tag.type !== "gaawc" && tag.type !== "googtag") {
        return;
      }

      const id = getParameterValue(tag, ["measurementId", "tagId"]);

      if (id) {
        ids.set(id, tag.name || id);
      }
    });

    return Array.from(ids.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [tags]);

  // Filter only existing GA4 Measurement IDs.
  const filteredMeasurementIds = useMemo(() => {
    const search = measurementSearch.toLowerCase().trim();

    if (!search) {
      return existingMeasurementIds;
    }

    return existingMeasurementIds.filter((item) =>
      `${item.id} ${item.name}`.toLowerCase().includes(search)
    );
  }, [existingMeasurementIds, measurementSearch]);

  // Workspace triggers available for autocomplete.
  const workspaceTriggers = useMemo(() => {
    return (store.triggers || []).filter(
      (trigger) =>
        typeof trigger?.triggerId === "string" &&
        trigger.triggerId.trim() !== "" &&
        typeof trigger?.name === "string" &&
        trigger.name.trim() !== ""
    );
  }, [store.triggers]);

  const filteredTriggers = useMemo(() => {
    const search = triggerSearch.toLowerCase().trim();

    if (!search) {
      return workspaceTriggers;
    }

    return workspaceTriggers.filter((trigger) =>
      `${trigger.name} ${trigger.type || ""}`
        .toLowerCase()
        .includes(search)
    );
  }, [workspaceTriggers, triggerSearch]);

  // Load workspace triggers.
  useEffect(() => {
    if (
      !showTagModal ||
      !isCreate ||
      !selectedAccountId ||
      !selectedContainerId ||
      !selectedWorkspaceId
    ) {
      return;
    }

    fetchTriggers();

    // Actions are recreated by the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showTagModal,
    isCreate,
    selectedAccountId,
    selectedContainerId,
    selectedWorkspaceId,
  ]);

  // Reset form when modal opens.
  useEffect(() => {
    if (showTagModal && isCreate) {
      setSelectedPlatforms(["ga4"]);

      setMeasurementId("");
      setMeasurementInput("");
      setMeasurementDropdownOpen(false);
      setMeasurementSearch("");
      setMeasurementCursor(0);

      setEventName("");

      setSelectedTriggerId("");
      setTriggerInput("");
      setTriggerDropdownOpen(false);
      setTriggerSearch("");
      setTriggerCursor(0);

      setMetaPixelId("");
      setLinkedinPartnerId("");
      setTiktokPixelId("");

      setFormError("");
    }
  }, [showTagModal, isCreate]);

  function selectPlatform(platform: Platform) {
    setSelectedPlatforms([platform]);
    setFormError("");
  }

  // Open Measurement ID dropdown when user types "{{".
  function handleMeasurementInput(value: string, cursor: number) {
    const openPosition = value.lastIndexOf("{{", cursor);
    const closePosition = value.lastIndexOf("}}", cursor);

    if (openPosition === -1 || closePosition > openPosition) {
      setMeasurementDropdownOpen(false);
      setMeasurementSearch("");
      return;
    }

    const search = value.slice(openPosition + 2, cursor);

    if (search.includes("}")) {
      setMeasurementDropdownOpen(false);
      return;
    }

    setMeasurementSearch(search);
    setMeasurementCursor(cursor);
    setMeasurementDropdownOpen(true);
  }

  // Select an existing GA4 Measurement ID.
  function insertMeasurementId(item: { id: string; name: string }) {
    const openPosition = measurementInput.lastIndexOf(
      "{{",
      measurementCursor
    );

    const closePosition = measurementInput.lastIndexOf(
      "}}",
      measurementCursor
    );

    const start =
      openPosition !== -1 && closePosition < openPosition
        ? openPosition
        : measurementCursor;

    const token = `{{${item.name}}}`;

    const updatedValue =
      measurementInput.slice(0, start) +
      token +
      measurementInput.slice(measurementCursor);

    setMeasurementInput(updatedValue);

    // Store the actual ID, not the visible name.
    setMeasurementId(item.id);

    setMeasurementDropdownOpen(false);
    setMeasurementSearch("");

    requestAnimationFrame(() => {
      const input = measurementInputRef.current;
      input?.focus();

      const newCursor = start + token.length;
      input?.setSelectionRange(newCursor, newCursor);
    });
  }

  // Open trigger dropdown when user types "{{".
  function handleTriggerInput(value: string, cursor: number) {
    const openPosition = value.lastIndexOf("{{", cursor);
    const closePosition = value.lastIndexOf("}}", cursor);

    if (openPosition === -1 || closePosition > openPosition) {
      setTriggerDropdownOpen(false);
      setTriggerSearch("");
      return;
    }

    const search = value.slice(openPosition + 2, cursor);

    if (search.includes("}")) {
      setTriggerDropdownOpen(false);
      return;
    }

    setTriggerSearch(search);
    setTriggerCursor(cursor);
    setTriggerDropdownOpen(true);
  }

  // Insert trigger name and store its actual GTM ID.
  function insertTrigger(trigger: {
    triggerId: string;
    name: string;
  }) {
    const openPosition = triggerInput.lastIndexOf(
      "{{",
      triggerCursor
    );

    const closePosition = triggerInput.lastIndexOf(
      "}}",
      triggerCursor
    );

    const start =
      openPosition !== -1 && closePosition < openPosition
        ? openPosition
        : triggerCursor;

    const token = `{{${trigger.name}}}`;

    const updatedValue =
      triggerInput.slice(0, start) +
      token +
      triggerInput.slice(triggerCursor);

    setTriggerInput(updatedValue);
    setSelectedTriggerId(trigger.triggerId);

    setTriggerDropdownOpen(false);
    setTriggerSearch("");

    requestAnimationFrame(() => {
      const input = triggerInputRef.current;
      input?.focus();

      const newCursor = start + token.length;
      input?.setSelectionRange(newCursor, newCursor);
    });
  }

  async function handleCreateGa4Tag() {
    setFormError("");

    if (selectedPlatforms.length === 0) {
      setFormError("Select a platform.");
      return;
    }

    const selectedPlatform = selectedPlatforms[0];

    if (selectedPlatform === "linkedin") {
      if (!linkedinPartnerId.trim()) {
        setFormError("Enter your LinkedIn Partner ID.");
        return;
      }

      setFormError(
        "LinkedIn ID input is ready. LinkedIn tag creation logic has not been connected yet."
      );
      return;
    }

    if (selectedPlatform === "tiktok") {
      if (!tiktokPixelId.trim()) {
        setFormError("Enter your TikTok Pixel ID.");
        return;
      }

      setFormError(
        "TikTok ID input is ready. TikTok tag creation logic has not been connected yet."
      );
      return;
    }

    if (selectedPlatform === "meta") {
      setFormError(
        "Meta fields are available, but Meta tag creation is not supported yet."
      );
      return;
    }

    // GA4 creation.
    const finalMeasurementId = measurementId.trim();

    if (!finalMeasurementId) {
      setFormError("Enter or select a GA4 Measurement ID.");
      return;
    }

    if (!eventName.trim()) {
      setFormError("Enter an event name.");
      return;
    }

    if (!selectedTriggerId) {
      setFormError(
        "Select a firing trigger from the dropdown after typing {{."
      );
      return;
    }

    try {
      setTagCrudLoading(true);

      const tag = {
        name: `${eventName.trim()} - GA4`,
        type: "gaawe",
        parameter: [
          {
            type: "template",
            key: "measurementId",
            value: finalMeasurementId,
          },
          {
            type: "template",
            key: "eventName",
            value: eventName.trim(),
          },
        ],
        firingTriggerId: [selectedTriggerId],
        tagFiringOption: "oncePerEvent",
      };

      const response = await fetch("/api/auth/gtm/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          containerId: selectedContainerId,
          workspaceId: selectedWorkspaceId,
          tag,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.details?.error?.message ||
            "Failed to create GA4 tag."
        );
      }

      setShowTagModal(false);
      await fetchTags();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to create GA4 tag."
      );
    } finally {
      setTagCrudLoading(false);
    }
  }

  // Measurement ID dropdown: only existing GA4 IDs.
  function MeasurementDropdown() {
    if (!measurementDropdownOpen) return null;

    return (
      <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-card shadow-xl">
        {filteredMeasurementIds.map((item) => (
          <button
            key={item.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertMeasurementId(item)}
            className="w-full px-3 py-2.5 text-left text-sm text-fg hover:bg-card-hi transition"
          >
            <span className="block font-medium">
              {`{{${item.name}}}`}
            </span>

            <span className="block text-xs text-muted mt-0.5">
              {item.id}
            </span>
          </button>
        ))}

        {filteredMeasurementIds.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted">
            No matching Measurement IDs found.
          </p>
        )}
      </div>
    );
  }

  // Trigger autocomplete dropdown.
  function TriggerDropdown() {
    if (!triggerDropdownOpen) return null;

    return (
      <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-card shadow-xl">
        {filteredTriggers.map((trigger) => (
          <button
            key={trigger.triggerId}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              insertTrigger({
                triggerId: trigger.triggerId,
                name: trigger.name!,
              })
            }
            className="w-full px-3 py-2.5 text-left text-sm text-fg hover:bg-card-hi transition"
          >
            <span className="block font-medium">
              {`{{${trigger.name}}}`}
            </span>

            <span className="block text-xs text-muted mt-0.5">
              {trigger.type || "Trigger"}
            </span>
          </button>
        ))}

        {filteredTriggers.length === 0 && (
          <p className="px-3 py-3 text-xs text-muted">
            No matching triggers found.
          </p>
        )}
      </div>
    );
  }

  const footer = selectedWorkspaceId ? (
    <>
      <button
        type="button"
        onClick={close}
        className="btn-secondary py-1.5! px-3!"
      >
        Cancel
      </button>

      <button
        type="button"
        disabled={tagCrudLoading}
        onClick={isCreate ? handleCreateGa4Tag : handleSaveTag}
        className="btn-primary py-1.5! px-3! disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {tagCrudLoading
          ? "Saving..."
          : isCreate
            ? "Create Tag"
            : "Save tag"}
      </button>
    </>
  ) : null;

  return (
    <>
      <Modal
        open={showTagModal}
        onClose={close}
        size="lg"
        title={isCreate ? "Create New Tag" : "Edit tag"}
        initialFocusRef={inputRef}
        footer={footer}
      >
        {!selectedWorkspaceId ? (
          <p className="text-sm text-muted">
            Please select a workspace first.
          </p>
        ) : !isCreate ? (
          <div>
            <label
              htmlFor="tag-name"
              className="block text-[12.5px] font-medium text-fg mb-2"
            >
              Tag name
            </label>

            <input
              id="tag-name"
              ref={inputRef}
              value={tagNameInput}
              onChange={(e) => setTagNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !tagCrudLoading) {
                  handleSaveTag();
                }
              }}
              placeholder="Enter tag name"
              className="w-full bg-page-soft"
            />
          </div>
        ) : (
          <div className="space-y-5">
            {/* PLATFORM SELECTION */}
            <div>
              <h3 className="text-sm font-semibold text-fg mb-3">
                Select Platform
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["ga4", "GA4"],
                    ["meta", "Meta"],
                    ["linkedin", "LinkedIn"],
                    ["tiktok", "TikTok"],
                  ] as [Platform, string][]
                ).map(([platform, label]) => (
                  <label
                    key={platform}
                    className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 cursor-pointer hover:bg-card-hi transition"
                  >
                    <input
                      type="radio"
                      name="tag-platform"
                      checked={selectedPlatforms.includes(platform)}
                      onChange={() => selectPlatform(platform)}
                      className="h-4 w-4 accent-blue-600"
                    />

                    <span className="text-sm font-medium text-fg">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* GA4 CONFIGURATION */}
            {selectedPlatforms.includes("ga4") && (
              <div className="rounded-xl border border-line p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    GA4 Configuration
                  </h3>

                  <p className="text-xs text-muted mt-1">
                    Configure your GA4 event tag.
                  </p>
                </div>

                {/* MEASUREMENT ID */}
                <div>
                  <label
                    htmlFor="ga4-measurement-id"
                    className="block text-sm font-medium text-fg mb-2"
                  >
                    Measurement ID
                  </label>

                  <div className="relative">
                    <input
                      ref={measurementInputRef}
                      id="ga4-measurement-id"
                      type="text"
                      value={measurementInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cursor =
                          e.target.selectionStart ?? value.length;

                        setMeasurementInput(value);

                        // Manual values remain supported.
                        // Selecting a dropdown item stores its actual ID.
                        setMeasurementId(value);

                        handleMeasurementInput(value, cursor);
                      }}
                      onClick={(e) =>
                        handleMeasurementInput(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ?? 0
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setMeasurementDropdownOpen(false);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setMeasurementDropdownOpen(false);
                        }, 150);
                      }}
                      placeholder="Type {{ to search Measurement IDs"
                      className="w-full bg-page-soft"
                    />

                    <MeasurementDropdown />
                  </div>

                  <p className="text-xs text-muted mt-2">
                    Type {"{{"} to search existing GA4 Measurement IDs, or enter an ID manually.
                  </p>
                </div>

                {/* EVENT NAME */}
                <div>
                  <label
                    htmlFor="ga4-event-name"
                    className="block text-sm font-medium text-fg mb-2"
                  >
                    Event Name
                  </label>

                  <input
                    id="ga4-event-name"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. purchase"
                    className="w-full bg-page-soft"
                  />
                </div>
              </div>
            )}

            {/* LINKEDIN CONFIGURATION */}
            {selectedPlatforms.includes("linkedin") && (
              <div className="rounded-xl border border-line p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    LinkedIn Configuration
                  </h3>

                  <p className="text-xs text-muted mt-1">
                    Enter your LinkedIn Partner ID.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="linkedin-partner-id"
                    className="block text-sm font-medium text-fg mb-2"
                  >
                    LinkedIn Partner ID
                  </label>

                  <input
                    id="linkedin-partner-id"
                    type="text"
                    value={linkedinPartnerId}
                    onChange={(e) =>
                      setLinkedinPartnerId(e.target.value)
                    }
                    placeholder="Enter LinkedIn Partner ID"
                    className="w-full bg-page-soft"
                  />
                </div>
              </div>
            )}

            {/* TIKTOK CONFIGURATION */}
            {selectedPlatforms.includes("tiktok") && (
              <div className="rounded-xl border border-line p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    TikTok Configuration
                  </h3>

                  <p className="text-xs text-muted mt-1">
                    Enter your TikTok Pixel ID.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="tiktok-pixel-id"
                    className="block text-sm font-medium text-fg mb-2"
                  >
                    TikTok Pixel ID
                  </label>

                  <input
                    id="tiktok-pixel-id"
                    type="text"
                    value={tiktokPixelId}
                    onChange={(e) =>
                      setTiktokPixelId(e.target.value)
                    }
                    placeholder="Enter TikTok Pixel ID"
                    className="w-full bg-page-soft"
                  />
                </div>
              </div>
            )}

            {/* META CONFIGURATION */}
            {selectedPlatforms.includes("meta") && (
              <div className="rounded-xl border border-line p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    Meta Configuration
                  </h3>

                  <p className="text-xs text-muted mt-1">
                    Configure your Meta Pixel event.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="meta-pixel-id"
                    className="block text-sm font-medium text-fg mb-2"
                  >
                    Meta Pixel ID
                  </label>

                  <input
                    id="meta-pixel-id"
                    type="text"
                    value={metaPixelId}
                    onChange={(e) => setMetaPixelId(e.target.value)}
                    placeholder="Enter Meta Pixel ID"
                    className="w-full bg-page-soft"
                  />
                </div>

                <div>
                  <label
                    htmlFor="meta-event-name"
                    className="block text-sm font-medium text-fg mb-2"
                  >
                    Event Name
                  </label>

                  <input
                    id="meta-event-name"
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="e.g. Purchase"
                    className="w-full bg-page-soft"
                  />
                </div>
              </div>
            )}

            {/* FIRING TRIGGER AUTOCOMPLETE */}
            <div className="rounded-xl border border-line p-4">
              <label
                htmlFor="firing-trigger"
                className="block text-sm font-medium text-fg mb-2"
              >
                Select Firing Trigger
              </label>

              <div className="relative">
                <input
                  ref={triggerInputRef}
                  id="firing-trigger"
                  type="text"
                  value={triggerInput}
                  disabled={store.triggersLoading}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cursor =
                      e.target.selectionStart ?? value.length;

                    setTriggerInput(value);
                    setSelectedTriggerId("");

                    handleTriggerInput(value, cursor);
                  }}
                  onClick={(e) =>
                    handleTriggerInput(
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ?? 0
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setTriggerDropdownOpen(false);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setTriggerDropdownOpen(false);
                    }, 150);
                  }}
                  placeholder={
                    store.triggersLoading
                      ? "Loading triggers..."
                      : "Type {{ to search triggers"
                  }
                  className="w-full bg-page-soft"
                />

                <TriggerDropdown />
              </div>

              {selectedTriggerId && (
                <p className="text-xs text-green-600 mt-2">
                  Trigger selected successfully.
                </p>
              )}

              {store.triggersError && (
                <p className="text-xs text-red-500 mt-2">
                  {store.triggersError}
                </p>
              )}

              {!store.triggersLoading &&
                !store.triggersError &&
                workspaceTriggers.length === 0 && (
                  <p className="text-xs text-muted mt-2">
                    No existing triggers found in this workspace.
                  </p>
                )}

              <p className="text-xs text-muted mt-2">
                Type {"{{"} to search your workspace triggers, then select a trigger.
              </p>
            </div>

            {/* FORM ERROR */}
            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <p className="text-sm text-red-500">
                  {formError}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/app/store/useDashboardStore";
import { X, ChevronDown, AlertTriangle } from "lucide-react";

function extractVariablesFromAny(input: any, set: Set<string>) {
    if (!input) return;

    if (typeof input === "string") {
        const matches = input.match(/{{(.*?)}}/g);
        if (matches) {
            matches.forEach((m) => {
                const clean = m.replace("{{", "").replace("}}", "").trim();
                if (clean) set.add(clean);
            });
        }
        return;
    }

    if (Array.isArray(input)) {
        input.forEach((x) => extractVariablesFromAny(x, set));
        return;
    }

    if (typeof input === "object") {
        Object.values(input).forEach((val) => extractVariablesFromAny(val, set));
    }
}

function getTemplateIdFromTagType(tagType: string) {
    if (!tagType?.includes("cvt_")) return null;
    const parts = tagType.split("_");
    return parts[parts.length - 1];
}

type SelectionState = {
    expandedTags: Record<string, boolean>;
    checkedTags: Record<string, boolean>;
    checkedTriggers: Record<string, boolean>;
    checkedVariables: Record<string, boolean>;
    checkedTemplates: Record<string, boolean>;
};

export default function ExportTagDependenciesModal({
    show,
    onClose,
    selectedTags,
    onContinue,
}: {
    show: boolean;
    onClose: () => void;
    selectedTags: any[];
    onContinue: (payload: {
        selectedTags: any[];
        selectedTriggerIds: string[];
        selectedVariableNames: string[];
        selectedTemplateIds: string[];
    }) => void;
}) {
    const store = useDashboardStore();

    const triggers = store.triggers || [];
    const variables = store.variables || [];

    const builtInTriggerMap: Record<string, string> = {
        "2147479553": "All Pages",
        "2147479554": "DOM Ready",
        "2147479555": "Window Loaded",
    };

    // ============================================================
    // BUILD DEPENDENCIES PER TAG
    // ============================================================
    const tagDependencies = useMemo(() => {
        return (selectedTags || []).map((tag: any) => {
            const triggerIds = new Set<string>();

            (tag.firingTriggerId || []).forEach((id: string) => triggerIds.add(id));
            (tag.blockingTriggerId || []).forEach((id: string) =>
                triggerIds.add(id)
            );

            const triggerList = Array.from(triggerIds).map((id) => {
                const trig = triggers.find((t: any) => t.triggerId === id);
                return {
                    triggerId: id,
                    name: trig?.name || builtInTriggerMap[id] || id,
                };
            });

            const variableNames = new Set<string>();

            // variables from tag parameter
            extractVariablesFromAny(tag.parameter, variableNames);

            // variables from trigger filters
            for (const tid of Array.from(triggerIds)) {
                const trig = triggers.find((t: any) => t.triggerId === tid);
                if (!trig) continue;

                extractVariablesFromAny(trig.filter, variableNames);
                extractVariablesFromAny(trig.autoEventFilter, variableNames);
                extractVariablesFromAny(trig.customEventFilter, variableNames);
            }

            const variableList = Array.from(variableNames).map((name) => {
                const v = variables.find((vv: any) => vv.name === name);
                return {
                    name,
                    type: v?.type || "unknown",
                };
            });

            const templateId = getTemplateIdFromTagType(tag.type);

            const templates = templateId
                ? [
                    {
                        templateId,
                        name: `Template ID: ${templateId}`,
                    },
                ]
                : [];

            return {
                tagId: tag.tagId,
                tagName: tag.name,
                triggers: triggerList,
                variables: variableList,
                templates,
            };
        });
    }, [selectedTags, triggers, variables]);

    // ============================================================
    // INITIAL DEFAULT STATE (NO useEffect)
    // ============================================================
    const initialSelection = useMemo((): SelectionState => {
        const checkedTags: Record<string, boolean> = {};
        const checkedTriggers: Record<string, boolean> = {};
        const checkedVariables: Record<string, boolean> = {};
        const checkedTemplates: Record<string, boolean> = {};
        const expandedTags: Record<string, boolean> = {};

        for (const t of tagDependencies) {
            checkedTags[t.tagId] = true;
            expandedTags[t.tagId] = true;

            for (const trig of t.triggers) {
                checkedTriggers[trig.triggerId] = true;
            }

            for (const v of t.variables) {
                checkedVariables[v.name] = true;
            }

            for (const tp of t.templates) {
                checkedTemplates[tp.templateId] = true;
            }
        }

        return {
            checkedTags,
            checkedTriggers,
            checkedVariables,
            checkedTemplates,
            expandedTags,
        };
    }, [tagDependencies]);

    const [selection, setSelection] = useState<SelectionState>(initialSelection);

    // ============================================================
    // RESET STATE WHEN TAGS CHANGE (NO useEffect needed)
    // ============================================================
    const resetKey = useMemo(() => {
        return (selectedTags || []).map((t: any) => t.tagId).join(",");
    }, [selectedTags]);

    // If tags changed, reset state
    useMemo(() => {
        setSelection(initialSelection);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    // ============================================================
    // GLOBAL COUNTS
    // ============================================================
    const globalCounts = useMemo(() => {
        const allTriggers = new Set<string>();
        const allVariables = new Set<string>();
        const allTemplates = new Set<string>();

        for (const t of tagDependencies) {
            t.triggers.forEach((tr) => allTriggers.add(tr.triggerId));
            t.variables.forEach((v) => allVariables.add(v.name));
            t.templates.forEach((tp) => allTemplates.add(tp.templateId));
        }

        return {
            triggers: allTriggers.size,
            variables: allVariables.size,
            templates: allTemplates.size,
        };
    }, [tagDependencies]);

    // ============================================================
    // CONTINUE HANDLER
    // ============================================================
    function handleContinue() {
        const finalTags = (selectedTags || []).filter(
            (t: any) => selection.checkedTags[t.tagId]
        );

        const selectedTriggerIds = Object.entries(selection.checkedTriggers)
            .filter(([val]) => val)
            .map(([key]) => key);

        const selectedVariableNames = Object.entries(selection.checkedVariables)
            .filter(([val]) => val)
            .map(([key]) => key);

        const selectedTemplateIds = Object.entries(selection.checkedTemplates)
            .filter(([val]) => val)
            .map(([key]) => key);

        onContinue({
            selectedTags: finalTags,
            selectedTriggerIds,
            selectedVariableNames,
            selectedTemplateIds,
        });
    }

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card text-fg w-full max-w-4xl rounded-xl border border-edge shadow-lg overflow-hidden">
                {/* HEADER */}
                <div className="flex justify-between items-center px-5 py-3 border-b border-line">
                    <div>
                        <h2 className="text-[15px] font-semibold text-fg">
                            Select Export Dependencies
                        </h2>
                        <p className="text-[12px] text-muted mt-0.5">
                            Tags: {selectedTags.length} | Triggers: {globalCounts.triggers} |
                            Variables: {globalCounts.variables} | Templates:{" "}
                            {globalCounts.templates}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-card-hi text-base"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
                    {tagDependencies.map((tag) => {
                        const tagSelected = selection.checkedTags[tag.tagId];

                        const hasWarning =
                            tagSelected &&
                            (tag.triggers.some(
                                (t) => selection.checkedTriggers[t.triggerId] === false
                            ) ||
                                tag.variables.some(
                                    (v) => selection.checkedVariables[v.name] === false
                                ) ||
                                tag.templates.some(
                                    (tp) => selection.checkedTemplates[tp.templateId] === false
                                ));

                        return (
                            <div
                                key={tag.tagId}
                                className="border border-line rounded-xl bg-card overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-4 py-3 bg-card-hi border-b border-line">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={!!selection.checkedTags[tag.tagId]}
                                            onChange={(e) =>
                                                setSelection((p) => ({
                                                    ...p,
                                                    checkedTags: {
                                                        ...p.checkedTags,
                                                        [tag.tagId]: e.target.checked,
                                                    },
                                                }))
                                            }
                                            className="w-4 h-4"
                                        />

                                        <div>
                                            <p className="text-[13px] font-medium text-fg">
                                                {tag.tagName}
                                            </p>
                                            <p className="text-[11px] text-faint">
                                                Tag ID: {tag.tagId}
                                            </p>
                                        </div>

                                        {hasWarning && (
                                            <div className="flex items-center gap-1 text-[11px] text-yellow-500">
                                                <AlertTriangle size={14} />
                                                Tag may fail if dependency not exported
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelection((p) => ({
                                                ...p,
                                                expandedTags: {
                                                    ...p.expandedTags,
                                                    [tag.tagId]: !p.expandedTags[tag.tagId],
                                                },
                                            }))
                                        }
                                        className="text-muted hover:text-fg"
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition ${selection.expandedTags[tag.tagId] ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>
                                </div>

                                {selection.expandedTags[tag.tagId] && (
                                    <div className="p-4 space-y-4">
                                        {tag.templates.length > 0 && (
                                            <div>
                                                <p className="text-[12px] font-semibold text-fg mb-2">
                                                    Templates
                                                </p>

                                                <div className="space-y-2">
                                                    {tag.templates.map((tp) => (
                                                        <label
                                                            key={tp.templateId}
                                                            className="flex items-center gap-2 text-[12px] text-fg"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    !!selection.checkedTemplates[tp.templateId]
                                                                }
                                                                onChange={(e) =>
                                                                    setSelection((p) => ({
                                                                        ...p,
                                                                        checkedTemplates: {
                                                                            ...p.checkedTemplates,
                                                                            [tp.templateId]: e.target.checked,
                                                                        },
                                                                    }))
                                                                }
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{tp.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-[12px] font-semibold text-fg mb-2">
                                                Triggers
                                            </p>

                                            {tag.triggers.length === 0 ? (
                                                <p className="text-[12px] text-muted">No triggers</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {tag.triggers.map((tr) => (
                                                        <label
                                                            key={tr.triggerId}
                                                            className="flex items-center gap-2 text-[12px] text-fg"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    !!selection.checkedTriggers[tr.triggerId]
                                                                }
                                                                onChange={(e) =>
                                                                    setSelection((p) => ({
                                                                        ...p,
                                                                        checkedTriggers: {
                                                                            ...p.checkedTriggers,
                                                                            [tr.triggerId]: e.target.checked,
                                                                        },
                                                                    }))
                                                                }
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{tr.name}</span>
                                                            <span className="text-[11px] text-faint font-mono">
                                                                ({tr.triggerId})
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="text-[12px] font-semibold text-fg mb-2">
                                                Variables
                                            </p>

                                            {tag.variables.length === 0 ? (
                                                <p className="text-[12px] text-muted">No variables</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {tag.variables.map((v) => (
                                                        <label
                                                            key={v.name}
                                                            className="flex items-center gap-2 text-[12px] text-fg"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={!!selection.checkedVariables[v.name]}
                                                                onChange={(e) =>
                                                                    setSelection((p) => ({
                                                                        ...p,
                                                                        checkedVariables: {
                                                                            ...p.checkedVariables,
                                                                            [v.name]: e.target.checked,
                                                                        },
                                                                    }))
                                                                }
                                                                className="w-4 h-4"
                                                            />
                                                            <span>{v.name}</span>
                                                            <span className="text-[11px] text-faint">
                                                                ({v.type})
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* FOOTER */}
                <div className="px-5 py-3 border-t border-line bg-page-soft flex justify-between items-center">
                    <button onClick={onClose} className="btn-secondary py-1.5! px-3!">
                        Cancel
                    </button>

                    <button onClick={handleContinue} className="btn-primary py-1.5! px-3!">
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
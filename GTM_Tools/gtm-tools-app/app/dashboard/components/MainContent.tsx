/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import StatsGrid from "./StatsGrid";
import QuickActions from "./QuickActions";
import Footer from "./Footer";

interface MainContentProps {
  activeTab: string;
  animateCards: boolean;

  containers: any[];
  workspaces: any[];
  tags: any[];
  triggers: any[];
  variables: any[];
}

export default function MainContent({
  activeTab,
  animateCards,
  containers,
  workspaces,
  tags,
  triggers,
  variables,
}: MainContentProps) {
  if (activeTab === "dashboard") {
    return (
      <>
        <StatsGrid
          animateCards={animateCards}
          containersCount={containers.length}
          workspacesCount={workspaces.length}
          tagsCount={tags.length}
          triggersCount={triggers.length}
          variablesCount={variables.length}
        />

        <QuickActions />
        <Footer />
      </>
    );
  }

  if (activeTab === "tags") {
    return (
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold mb-4">Tags</h2>

        {tags.length === 0 ? (
          <p className="text-gray-500 text-sm">No tags found.</p>
        ) : (
          <ul className="space-y-3">
            {tags.map((tag: any) => (
              <li
                key={tag.tagId}
                className="border rounded-lg p-4 flex justify-between"
              >
                <div>
                  <p className="font-semibold">{tag.name}</p>
                  <p className="text-xs text-gray-500">{tag.type}</p>
                </div>

                <p className="text-xs text-gray-400">{tag.tagId}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (activeTab === "triggers") {
    return (
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold mb-4">Triggers</h2>

        {triggers.length === 0 ? (
          <p className="text-gray-500 text-sm">No triggers found.</p>
        ) : (
          <ul className="space-y-3">
            {triggers.map((trigger: any) => (
              <li
                key={trigger.triggerId}
                className="border rounded-lg p-4 flex justify-between"
              >
                <div>
                  <p className="font-semibold">{trigger.name}</p>
                  <p className="text-xs text-gray-500">{trigger.type}</p>
                </div>

                <p className="text-xs text-gray-400">{trigger.triggerId}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (activeTab === "variables") {
    return (
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold mb-4">Variables</h2>

        {variables.length === 0 ? (
          <p className="text-gray-500 text-sm">No variables found.</p>
        ) : (
          <ul className="space-y-3">
            {variables.map((variable: any) => (
              <li
                key={variable.variableId}
                className="border rounded-lg p-4 flex justify-between"
              >
                <div>
                  <p className="font-semibold">{variable.name}</p>
                  <p className="text-xs text-gray-500">{variable.type}</p>
                </div>

                <p className="text-xs text-gray-400">
                  {variable.variableId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return null;
}
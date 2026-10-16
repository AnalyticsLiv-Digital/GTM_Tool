import { gtmRequest } from "./gtm-api";
import type { GTMTrigger } from "./gtm-types";

export async function getServerTriggers(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest<{ trigger?: GTMTrigger[] }>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`
  );
}

export async function createServerTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  trigger: GTMTrigger
) {
  return gtmRequest<GTMTrigger>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
    {
      method: "POST",
      body: trigger,
    }
  );
}

export async function getOrCreateServerEventTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  eventName: string
) {
  const response = await getServerTriggers(
    accessToken,
    accountId,
    containerId,
    workspaceId
  );

  const triggers = response.trigger || [];

  const triggerName = `Automation - ${eventName}`;

  const existingTrigger = triggers.find(
    (trigger) => trigger.name === triggerName
  );

  if (existingTrigger) {
    return existingTrigger;
  }

  const trigger: GTMTrigger = {
    name: triggerName,
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          {
            type: "TEMPLATE",
            key: "arg0",
            value: "{{Event Name}}",
          },
          {
            type: "TEMPLATE",
            key: "arg1",
            value: eventName,
          },
        ],
      },
    ],
  };

  return createServerTrigger(
    accessToken,
    accountId,
    containerId,
    workspaceId,
    trigger
  );
}
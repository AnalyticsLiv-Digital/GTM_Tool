import { gtmRequest } from "./client";

export async function listTriggers(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest(
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
    accessToken
  );
}

export async function createTrigger(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  trigger: unknown
) {
  return gtmRequest(
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(trigger),
    }
  );
}

export async function updateTrigger(
  accessToken: string,
  path: string,
  trigger: unknown
) {
  return gtmRequest(
    path,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify(trigger),
    }
  );
}

export async function deleteTrigger(
  accessToken: string,
  path: string
) {
  return gtmRequest(
    path,
    accessToken,
    {
      method: "DELETE",
    }
  );
}
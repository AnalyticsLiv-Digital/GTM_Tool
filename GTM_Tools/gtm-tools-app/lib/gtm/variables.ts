import { gtmRequest } from "./client";

export async function listVariables(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest(
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
    accessToken
  );
}

export async function createVariable(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  variable: unknown
) {
  return gtmRequest(
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(variable),
    }
  );
}

export async function updateVariable(
  accessToken: string,
  path: string,
  variable: unknown
) {
  return gtmRequest(
    path,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify(variable),
    }
  );
}

export async function deleteVariable(
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
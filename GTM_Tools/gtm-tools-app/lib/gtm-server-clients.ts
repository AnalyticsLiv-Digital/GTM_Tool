import { gtmRequest } from "./gtm-api";
import type { GTMClient } from "./gtm-types";

export async function getServerClients(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest<{ client?: GTMClient[] }>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/clients`
  );
}

export async function getGA4ServerClient(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  const response = await getServerClients(
    accessToken,
    accountId,
    containerId,
    workspaceId
  );

  const clients = response.client || [];

  const ga4Client = clients.find(
    (client) =>
      client.name?.toLowerCase().includes("ga4") ||
      client.name?.toLowerCase().includes("google analytics") ||
      client.type?.toLowerCase().includes("ga4")
  );

  if (!ga4Client) {
    throw new Error(
      "GA4 Client was not found in the Server GTM workspace."
    );
  }

  return ga4Client;
}   
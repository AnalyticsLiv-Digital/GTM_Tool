import { gtmRequest } from "./gtm-api";
import type { GTMCustomTemplate } from "./gtm-types";

export async function getServerCustomTemplates(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest<{ template?: GTMCustomTemplate[] }>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`
  );
}

export async function getServerCustomTemplate(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  templateId: string
) {
  return gtmRequest<GTMCustomTemplate>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates/${templateId}`
  );
}
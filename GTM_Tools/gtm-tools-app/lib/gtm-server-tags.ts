import { gtmRequest } from "./gtm-api";
import type { GTMParameter, GTMTag } from "./gtm-types";

export async function getServerTags(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest<{ tag?: GTMTag[] }>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`
  );
}

export async function createServerTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: GTMTag
) {
  return gtmRequest<GTMTag>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
    {
      method: "POST",
      body: tag,
    }
  );
}

export async function updateServerTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string,
  tag: GTMTag
) {
  return gtmRequest<GTMTag>(
    accessToken,
    `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags/${tagId}`,
    {
      method: "PUT",
      body: tag,
    }
  );
}

export async function getOrCreateServerTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagName: string,
  templateTagType: string,
  parameters: GTMParameter[],
  triggerId: string
) {
  const response = await getServerTags(
    accessToken,
    accountId,
    containerId,
    workspaceId
  );

  const tags = response.tag || [];

  const existingTag = tags.find(
    (tag) => tag.name === tagName
  );

  if (existingTag) {
    const updatedTag: GTMTag = {
      ...existingTag,
      type: templateTagType,
      parameter: parameters,
      firingTriggerId: [triggerId],
      tagFiringOption: "ONCE_PER_EVENT",
    };

    return updateServerTag(
      accessToken,
      accountId,
      containerId,
      workspaceId,
      existingTag.tagId!,
      updatedTag
    );
  }

  const newTag: GTMTag = {
    name: tagName,
    type: templateTagType,
    parameter: parameters,
    firingTriggerId: [triggerId],
    tagFiringOption: "ONCE_PER_EVENT",
  };

  return createServerTag(
    accessToken,
    accountId,
    containerId,
    workspaceId,
    newTag
  );
}
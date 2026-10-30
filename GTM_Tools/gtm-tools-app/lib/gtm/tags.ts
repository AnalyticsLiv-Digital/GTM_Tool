import { gtmRequest } from "./client";

// =====================================================
// TYPES
// =====================================================

export interface GTMTag {
  tagId?: string;
  name?: string;
  type?: string;
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  parameter?: Array<{
    type?: string;
    key?: string;
    value?: string;
    list?: Array<{
      type?: string;
      key?: string;
      value?: string;
    }>;
    map?: Array<{
      type?: string;
      key?: string;
      value?: string;
    }>;
  }>;
  notes?: string;
  fingerprint?: string;
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

// =====================================================
// HELPERS
// =====================================================

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function buildTagsPath(
  accountId: string,
  containerId: string,
  workspaceId: string
): string {
  return [
    "accounts",
    encodePathValue(accountId),
    "containers",
    encodePathValue(containerId),
    "workspaces",
    encodePathValue(workspaceId),
    "tags",
  ].join("/");
}

// =====================================================
// LIST TAGS
// =====================================================

export async function listTags(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return gtmRequest(
    buildTagsPath(
      accountId,
      containerId,
      workspaceId
    ),
    accessToken
  );
}

// =====================================================
// CREATE TAG
// =====================================================

export async function createTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tag: GTMTag
) {
  return gtmRequest(
    buildTagsPath(
      accountId,
      containerId,
      workspaceId
    ),
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(tag),
    }
  );
}

// =====================================================
// UPDATE TAG
// =====================================================

export async function updateTag(
  accessToken: string,
  path: string,
  tag: GTMTag
) {
  return gtmRequest(
    path,
    accessToken,
    {
      method: "PUT",
      body: JSON.stringify(tag),
    }
  );
}

// =====================================================
// DELETE TAG
// =====================================================

export async function deleteTag(
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
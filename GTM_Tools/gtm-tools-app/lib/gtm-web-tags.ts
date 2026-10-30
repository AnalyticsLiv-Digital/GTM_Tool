import {
  gtmRequest,
} from "./gtm-api";

import {
  GTMParameter,
  GTMTag,
} from "./gtm-types";

type GTMTagListResponse = {
  tag?: GTMTag[];

  nextPageToken?: string;
};

function workspacePath(
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  return (
    `accounts/${accountId}` +
    `/containers/${containerId}` +
    `/workspaces/${workspaceId}`
  );
}

export async function getWebTags(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string
) {
  const tags: GTMTag[] = [];

  let pageToken:
    | string
    | undefined;

  do {
    const response =
      await gtmRequest<GTMTagListResponse>(
        accessToken,

        `${workspacePath(
          accountId,
          containerId,
          workspaceId
        )}/tags`,

        {
          query: {
            pageToken,
          },
        }
      );

    tags.push(
      ...(response.tag || [])
    );

    pageToken =
      response.nextPageToken;
  } while (pageToken);

  return tags;
}

export async function updateWebTag(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  tagId: string,
  tag: GTMTag
) {
  return gtmRequest<GTMTag>(
    accessToken,

    `${workspacePath(
      accountId,
      containerId,
      workspaceId
    )}/tags/${tagId}`,

    {
      method: "PUT",

      body: tag,
    }
  );
}

function updateParameter(
  parameters: GTMParameter[],
  key: string,
  value: string
) {
  const parameter = {
    type: "TEMPLATE",
    key,
    value,
  };

  const index =
    parameters.findIndex(
      item => item.key === key
    );

  if (index === -1) {
    return [
      ...parameters,
      parameter,
    ];
  }

  return parameters.map(
    (item, itemIndex) =>
      itemIndex === index
        ? parameter
        : item
  );
}

export async function connectWebGoogleTagToServer(
  accessToken: string,
  accountId: string,
  webContainerId: string,
  webWorkspaceId: string,
  serverContainerUrl: string
) {
  const tags =
    await getWebTags(
      accessToken,
      accountId,
      webContainerId,
      webWorkspaceId
    );

  const googleTags =
    tags.filter(
      tag =>
        tag.type === "googtag"
    );

  if (!googleTags.length) {
    throw new Error(
      "No Google Tag was found in the Web GTM workspace."
    );
  }

  const googleTag =
    googleTags[0];

  const parameters =
    updateParameter(
      googleTag.parameter || [],
      "server_container_url",
      serverContainerUrl
    );

  const updatedTag: GTMTag = {
    ...googleTag,

    parameter: parameters,
  };

  if (!googleTag.tagId) {
    throw new Error(
      "Google Tag does not contain tagId."
    );
  }

  return updateWebTag(
    accessToken,

    accountId,

    webContainerId,

    webWorkspaceId,

    googleTag.tagId,

    updatedTag
  );
}
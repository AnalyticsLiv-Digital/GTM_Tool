
import { getServerTags } from "./gtm-server-tags";

export async function resolveTemplateTagType(
  accessToken: string,
  accountId: string,
  containerId: string,
  workspaceId: string,
  templateId: string
): Promise<string | undefined> {
  const response = await getServerTags(
    accessToken,
    accountId,
    containerId,
    workspaceId
  );

  const tags = response.tag || [];

  const matchingTag = tags.find(
    (tag) =>
      tag.type?.startsWith("cvt_") &&
      tag.notes?.includes(templateId)
  );

  return matchingTag?.type;
}


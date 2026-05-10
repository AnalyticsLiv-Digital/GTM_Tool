// Lightweight Zod schemas for write bodies hitting our GTM proxy.
//
// We intentionally do NOT enumerate every valid GTM type/parameter — Google's
// surface is huge and changes. Goal here is just to reject obvious garbage at
// our edge so we don't burn quota / surface vague upstream errors. Anything
// past `name` and `type` is forwarded to Google as-is.

import { z } from "zod";

const idField = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid id format");

export const accountIdField = idField;
export const containerIdField = idField;
export const workspaceIdField = idField;

const gtmName = z.string().trim().min(1).max(200);
const gtmType = z.string().trim().min(1).max(100);

// `passthrough` lets unknown GTM-specific fields ride through to Google
// without us pretending to validate them.
const gtmResource = z
  .object({
    name: gtmName,
    type: gtmType.optional(),
  })
  .passthrough();

export const tagBodySchema = z.object({
  accountId: accountIdField,
  containerId: containerIdField,
  workspaceId: workspaceIdField,
  tagId: idField.optional(),
  tag: gtmResource.extend({ type: gtmType }),
});

export const triggerBodySchema = z.object({
  accountId: accountIdField,
  containerId: containerIdField,
  workspaceId: workspaceIdField,
  triggerId: idField.optional(),
  trigger: gtmResource.extend({ type: gtmType }),
});

export const variableBodySchema = z.object({
  accountId: accountIdField,
  containerId: containerIdField,
  workspaceId: workspaceIdField,
  variableId: idField.optional(),
  variable: gtmResource.extend({ type: gtmType }),
});

export const templateBodySchema = z.object({
  accountId: accountIdField,
  containerId: containerIdField,
  workspaceId: workspaceIdField,
  template: z
    .union([
      z.object({ name: gtmName, templateData: z.string().min(1) }).passthrough(),
      z.array(z.object({ name: gtmName, templateData: z.string().min(1) }).passthrough()).min(1),
    ]),
});

// Minimal TypeScript types for the GTM v2 surface this app actually touches.
// Intentionally narrow — full GTM resource shapes are huge and evolve. We type
// the fields we read in the UI; everything else is allowed via index signature
// so unknown server fields don't crash compilation when Google adds new ones.

export interface GtmAccount {
  accountId: string;
  name?: string;
  path?: string;
  fingerprint?: string;
  [k: string]: unknown;
}

export interface GtmContainer {
  containerId: string;
  accountId?: string;
  name?: string;
  publicId?: string;
  usageContext?: string[];
  fingerprint?: string;
  path?: string;
  [k: string]: unknown;
}

export interface GtmWorkspace {
  workspaceId: string;
  accountId?: string;
  containerId?: string;
  name?: string;
  description?: string;
  fingerprint?: string;
  path?: string;
  [k: string]: unknown;
}

export interface GtmParameter {
  type?: string;
  key?: string;
  value?: string;
  list?: GtmParameter[];
  map?: GtmParameter[];
  [k: string]: unknown;
}

export interface GtmTag {
  tagId: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  name?: string;
  type?: string;
  parameter?: GtmParameter[];
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  fingerprint?: string;
  [k: string]: unknown;
}

export interface GtmTrigger {
  triggerId: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  name?: string;
  type?: string;
  parameter?: GtmParameter[];
  filter?: GtmParameter[];
  customEventFilter?: GtmParameter[];
  autoEventFilter?: GtmParameter[];
  fingerprint?: string;
  [k: string]: unknown;
}

export interface GtmVariable {
  variableId: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  name?: string;
  type?: string;
  parameter?: GtmParameter[];
  fingerprint?: string;
  [k: string]: unknown;
}

export interface GtmTemplate {
  templateId: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  name?: string;
  templateData?: string;
  fingerprint?: string;
  [k: string]: unknown;
}

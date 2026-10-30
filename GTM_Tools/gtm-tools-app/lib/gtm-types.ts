export type GTMParameter = {
  type: string;
  key: string;
  value?: string;
  list?: GTMParameter[];
  map?: GTMParameter[];
};

export type GTMTag = {
  path?: string;

  accountId?: string;
  containerId?: string;
  workspaceId?: string;

  tagId?: string;

  name: string;
  type: string;

  parameter?: GTMParameter[];

  firingTriggerId?: string[];

  blockingTriggerId?: string[];

  tagFiringOption?: string;

  notes?: string;

  fingerprint?: string;
};

export type GTMTriggerCondition = {
  type: string;

  parameter: GTMParameter[];
};

export type GTMTrigger = {
  path?: string;

  accountId?: string;
  containerId?: string;
  workspaceId?: string;

  triggerId?: string;

  name: string;

  type: string;

  customEventFilter?: GTMTriggerCondition[];

  filter?: GTMTriggerCondition[];

  fingerprint?: string;
};

export type GTMClient = {
  path?: string;

  accountId?: string;
  containerId?: string;
  workspaceId?: string;

  clientId?: string;

  name: string;

  type: string;

  parameter?: GTMParameter[];

  priority?: number;

  fingerprint?: string;
};

export type GTMCustomTemplate = {
  path?: string;

  accountId?: string;
  containerId?: string;
  workspaceId?: string;

  templateId: string;

  name: string;

  templateData?: string;

  fingerprint?: string;

  tagManagerUrl?: string;

  galleryReference?: {
    owner?: string;
    repository?: string;
    signature?: string;
    templateDeveloperId?: string;
    version?: string;
  };
};
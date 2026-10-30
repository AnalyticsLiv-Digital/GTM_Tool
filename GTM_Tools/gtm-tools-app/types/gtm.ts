export type GTMAccount = {
  accountId: string;
  name: string;
  path?: string;
};

export type GTMContainer = {
  containerId: string;
  name: string;
  publicId?: string;
  path?: string;
};

export type GTMWorkspace = {
  workspaceId: string;
  name: string;
  path?: string;
};

export type GTMTag = {
  tagId?: string;
  name: string;
  type: string;
  parameter?: GTMParameter[];
  firingTriggerId?: string[];
  [key: string]: unknown;
};

export type GTMTrigger = {
  triggerId?: string;
  name: string;
  type: string;
  customEventFilter?: GTMFilter[];
  [key: string]: unknown;
};

export type GTMVariable = {
  variableId?: string;
  name: string;
  type: string;
  parameter?: GTMParameter[];
  [key: string]: unknown;
};

export type GTMParameter = {
  type: string;
  key: string;
  value?: string;
  list?: GTMParameter[];
  map?: GTMParameter[];
};

export type GTMFilter = {
  type: string;
  parameter: GTMParameter[];
};

type GTMParameter = {
  type: string;
  key?: string;
  value?: string;
  list?: GTMParameter[];
  map?: GTMParameter[];
};

type GTMTag = {
  tagId?: string;
  name?: string;
  type?: string;
  parameter?: GTMParameter[];
  firingTriggerId?: string[];
  tagFiringOption?: string;
};

type GTMTrigger = {
  triggerId?: string;
  name?: string;
  type?: string;
  filter?: Array<{
    type: string;
    parameter: GTMParameter[];
  }>;
};

async function gtmRequest<T>(
  token: string,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const response = await fetch(
    `https://tagmanager.googleapis.com/tagmanager/v2/${path}`,
    {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google Tag Manager API request failed (${response.status}): ${await response.text()}`
    );
  }

  return (await response.json()) as T;
}

type Ids = {
  accountId: string;
  containerId: string;
  workspaceId: string;
};

type GTMVariable = {
  variableId?: string;
  name: string;
  type: string;
  parameter?: GTMParameter[];
};

function parent(ids: Ids) {
  return `accounts/${ids.accountId}/containers/${ids.containerId}/workspaces/${ids.workspaceId}`;
}

function template(key: string, value: string): GTMParameter {
  return { type: "TEMPLATE", key, value };
}

function bool(key: string, value: boolean): GTMParameter {
  return {
    type: "BOOLEAN",
    key,
    value: String(value),
  };
}

async function listTags(token: string, ids: Ids) {
  const result = await gtmRequest<{ tag?: GTMTag[] }>(
    token,
    `${parent(ids)}/tags`
  );
  return result.tag || [];
}

async function saveTag(
  token: string,
  ids: Ids,
  existing: GTMTag | undefined,
  desired: GTMTag
) {
  if (existing?.tagId) {
    return gtmRequest<GTMTag>(
      token,
      `${parent(ids)}/tags/${existing.tagId}`,
      {
        method: "PUT",
        body: {
          ...existing,
          ...desired,
          tagId: existing.tagId,
        },
      }
    );
  }

  return gtmRequest<GTMTag>(
    token,
    `${parent(ids)}/tags`,
    { method: "POST", body: desired }
  );
}

async function listVariables(token: string, ids: Ids) {
  const result = await gtmRequest<{
    variable?: GTMVariable[];
  }>(token, `${parent(ids)}/variables`);

  return result.variable || [];
}

async function getOrCreateServerUrlVariable(
  token: string,
  ids: Ids,
  serverUrl: string
) {
  const variables = await listVariables(token, ids);
  const existing = variables.find(
    (item) => item.name === "Automation - Server Container URL"
  );

  const desired: GTMVariable = {
    name: "Automation - Server Container URL",
    type: "gtcs",
    parameter: [
      {
        type: "LIST",
        key: "configSettingsTable",
        list: [
          {
            type: "MAP",
            map: [
              template("parameter", "server_container_url"),
              template("parameterValue", serverUrl),
            ],
          },
        ],
      },
    ],
  };

  if (existing?.variableId) {
    return gtmRequest<GTMVariable>(
      token,
      `${parent(ids)}/variables/${existing.variableId}`,
      {
        method: "PUT",
        body: {
          ...existing,
          ...desired,
          variableId: existing.variableId,
        },
      }
    );
  }

  return gtmRequest<GTMVariable>(
    token,
    `${parent(ids)}/variables`,
    { method: "POST", body: desired }
  );
}

async function getOrCreatePageViewTrigger(
  token: string,
  ids: Ids
) {
  const result = await gtmRequest<{
    trigger?: GTMTrigger[];
  }>(token, `${parent(ids)}/triggers`);

  const existing = (result.trigger || []).find(
    (item) =>
      item.name === "Automation - All Pages" &&
      item.type === "PAGEVIEW"
  );

  if (existing?.triggerId) return existing.triggerId;

  const created = await gtmRequest<GTMTrigger>(
    token,
    `${parent(ids)}/triggers`,
    {
      method: "POST",
      body: {
        name: "Automation - All Pages",
        type: "PAGEVIEW",
      },
    }
  );

  if (!created.triggerId) {
    throw new Error("Could not create the All Pages trigger.");
  }

  return created.triggerId;
}

export async function configureWebGtag(
  token: string,
  ids: Ids,
  measurementId: string,
  serverUrl: string
) {
  const variable = await getOrCreateServerUrlVariable(
    token,
    ids,
    serverUrl
  );

  const tags = await listTags(token, ids);
  const existing = tags.find((item) => item.type === "googtag");

  const triggerId = await getOrCreatePageViewTrigger(token, ids);

  const parameters: GTMParameter[] = [
    template("tagId", measurementId),
    template(
      "configSettingsVariable",
      `{{${variable.name}}}`
    ),
  ];

  const desired: GTMTag = {
    name: existing?.name || "Automation - Google Tag",
    type: "googtag",
    parameter: parameters,
    firingTriggerId: existing?.firingTriggerId?.length
      ? existing.firingTriggerId
      : [triggerId],
  };

  const saved = await saveTag(token, ids, existing, desired);

  return {
    action: existing ? "updated" : "created",
    tagId: saved.tagId,
    name: saved.name,
    type: saved.type,
    serverUrl,
    configVariable: variable.name,
  };
}

async function listTriggers(token: string, ids: Ids) {
  const result = await gtmRequest<{
    trigger?: GTMTrigger[];
  }>(token, `${parent(ids)}/triggers`);

  return result.trigger || [];
}

export async function getOrCreateServerEventTrigger(
  token: string,
  ids: Ids,
  eventName: string
) {
  const triggers = await listTriggers(token, ids);
  const name = `Automation - ${eventName}`;

  const existing = triggers.find(
    (item) => item.name === name
  );

  if (existing?.triggerId) {
    return {
      action: "reused",
      triggerId: existing.triggerId,
      name,
    };
  }

  // Server-side custom-event trigger: filter the event data.
  const created = await gtmRequest<GTMTrigger>(
    token,
    `${parent(ids)}/triggers`,
    {
      method: "POST",
      body: {
        name,
        type: "CUSTOM_EVENT",
        filter: [
          {
            type: "EQUALS",
            parameter: [
              template("arg0", "{{Event Name}}"),
              template("arg1", eventName),
            ],
          },
        ],
      },
    }
  );

  if (!created.triggerId) {
    throw new Error(`Could not create trigger for ${eventName}.`);
  }

  return {
    action: "created",
    triggerId: created.triggerId,
    name: created.name,
  };
}

export async function configureServerGa4EventTag(
  token: string,
  ids: Ids,
  eventName: string,
  triggerId: string,
  measurementId: string
) {
  const tags = await listTags(token, ids);
  const name = `Automation - GA4 - ${eventName}`;

  const existing = tags.find((item) => item.name === name);

  const desired: GTMTag = {
    name,
    type: "sgtmgaaw",
    parameter: [
      template("measurementId", measurementId),
      template("eventName", "{{Event Name}}"),
      template("epToIncludeDropdown", "all"),
      template("upToIncludeDropdown", "all"),
      bool("redactVisitorIp", true),
    ],
    firingTriggerId: [triggerId],
    tagFiringOption: "ONCE_PER_EVENT",
  };

  const saved = await saveTag(token, ids, existing, desired);

  return {
    action: existing ? "updated" : "created",
    tagId: saved.tagId,
    name: saved.name,
    type: saved.type,
  };
}

export async function verifyServerGa4Client(
  token: string,
  ids: Ids
) {
  const result = await gtmRequest<{
    client?: Array<{
      clientId?: string;
      name?: string;
      type?: string;
    }>;
  }>(token, `${parent(ids)}/clients`);

  const client = (result.client || []).find(
    (item) =>
      item.type === "gaaw_client" ||
      /google analytics|ga4/i.test(
        `${item.name || ""} ${item.type || ""}`
      )
  );

  if (!client) {
    throw new Error(
      "A GA4-compatible Server GTM Client is missing. Add a supported Google Analytics Client to this workspace, then run automation again."
    );
  }

  return {
    clientId: client.clientId,
    name: client.name,
    type: client.type,
  };
}

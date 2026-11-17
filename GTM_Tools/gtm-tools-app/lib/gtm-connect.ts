import {
  connectWebGoogleTagToServer,
} from "./gtm-web-tags";

import {
  getGA4ServerClient,
} from "./gtm-server-clients";

import {
  getOrCreateServerEventTrigger,
} from "./gtm-server-triggers";

import {
  getOrCreateServerTag,
} from "./gtm-server-tags";

import {
  getServerCustomTemplate,
} from "./gtm-server-templates";

import {
  getTemplateFields,
} from "./gtm-template-parser";

import {
  buildTemplateParameters,
} from "./gtm-template-parameters";

export type ConnectGTMOptions = {
  accessToken: string;

  accountId: string;

  web: {
    containerId: string;

    workspaceId: string;
  };

  server: {
    containerId: string;

    workspaceId: string;

    containerUrl: string;
  };

  templateId: string;

  templateTagType: string;

  eventName: string;

  templateValues: Record<
    string,
    unknown
  >;
};

export async function connectGTM(
  options: ConnectGTMOptions
) {
  /*
   * ======================================
   * PHASE 1
   * WEB → SERVER
   * ======================================
   */

  const webGoogleTag =
    await connectWebGoogleTagToServer(
      options.accessToken,

      options.accountId,

      options.web.containerId,

      options.web.workspaceId,

      options.server.containerUrl
    );

  /*
   * ======================================
   * PHASE 2
   * SERVER CLIENT
   * ======================================
   */

  const serverClient =
    await getGA4ServerClient(
      options.accessToken,

      options.accountId,

      options.server.containerId,

      options.server.workspaceId
    );

  /*
   * ======================================
   * PHASE 2
   * SERVER TRIGGER
   * ======================================
   */

  const trigger =
    await getOrCreateServerEventTrigger(
      options.accessToken,

      options.accountId,

      options.server.containerId,

      options.server.workspaceId,

      options.eventName
    );

  if (!trigger.triggerId) {
    throw new Error(
      "Server trigger ID was not returned."
    );
  }

  /*
   * ======================================
   * PHASE 3
   * CUSTOM TEMPLATE
   * ======================================
   */

  const template =
    await getServerCustomTemplate(
      options.accessToken,

      options.accountId,

      options.server.containerId,

      options.server.workspaceId,

      options.templateId
    );

  /*
   * ======================================
   * PHASE 3
   * TEMPLATE FIELDS
   * ======================================
   */

  const fields =
    getTemplateFields(
      template.templateData
    );

  /*
   * ======================================
   * PHASE 3
   * TEMPLATE VALUES
   * ======================================
   */

  const parameters =
    buildTemplateParameters(
      fields,

      options.templateValues
    );

  /*
   * ======================================
   * PHASE 2 + 3
   * SERVER TAG
   * ======================================
   */

  const tag =
    await getOrCreateServerTag(
      options.accessToken,

      options.accountId,

      options.server.containerId,

      options.server.workspaceId,

      `Automation - ${template.name} - ${options.eventName}`,

      options.templateTagType,

      parameters,

      trigger.triggerId
    );

  return {
    success: true,

    phase1: {
      googleTag:
        webGoogleTag,
    },

    phase2: {
      client:
        serverClient,

      trigger,

      tag,
    },

    phase3: {
      template: {
        id:
          template.templateId,

        name:
          template.name,
      },

      fields,

      parameters,
    },
  };
}
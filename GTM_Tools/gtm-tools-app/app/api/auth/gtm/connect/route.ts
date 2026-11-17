import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  configureServerGa4EventTag,
  configureServerLinkedInEventTag,
  configureServerMetaEventTag,
  configureServerTikTokEventTag,
  configureWebGtag,
  ensureServerPlatformTemplate,
  getOrCreateServerEventTrigger,
} from "@/lib/gtm/gtm-automation";
import { verifyToken } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackingPlatform = "kp_ga4" | "meta" | "linkedin" | "tiktok";

type PlatformConfigs = {
  meta?: { pixelId?: string; accessToken?: string; testEventCode?: string };
  linkedin?: { accessToken?: string; partnerId?: string; conversionRuleId?: string };
  tiktok?: { pixelId?: string; accessToken?: string; testEventCode?: string };
};

type Body = {
  accountId?: unknown;
  webContainerId?: unknown;
  webWorkspaceId?: unknown;
  serverContainerId?: unknown;
  serverWorkspaceId?: unknown;
  serverContainerUrl?: unknown;
  webMeasurementId?: unknown;
  serverMeasurementId?: unknown;
  selectedPlatforms?: unknown;
  platformConfigs?: unknown;
  eventNames?: unknown;
};

type GtmIds = { accountId: string; containerId: string; workspaceId: string };
type PlatformStatus = {
  status: "pending" | "completed" | "failed";
  message: string;
  configuredEvents?: string[];
};

const ALLOWED_PLATFORMS: TrackingPlatform[] = ["kp_ga4", "meta", "linkedin", "tiktok"];
const PLATFORM_LABELS: Record<TrackingPlatform, string> = {
  kp_ga4: "GA4",
  meta: "Meta",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function validateServerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid Server Container URL.");
  }
  if (url.protocol !== "https:") throw new Error("Server Container URL must use HTTPS.");
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Enter the Server Container URL without credentials, query parameters, or a fragment.");
  }
  return url.origin;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred while configuring GTM.";
}

async function authenticate(): Promise<{ token: string } | { response: NextResponse }> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (!authToken) {
    return { response: NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 }) };
  }
  const payload = verifyToken(authToken);
  if (!payload) {
    return { response: NextResponse.json({ success: false, error: "Invalid authentication token." }, { status: 401 }) };
  }
  const user = await getUserById(payload.id);
  if (!user) {
    return { response: NextResponse.json({ success: false, error: "Authenticated user was not found." }, { status: 401 }) };
  }
  return { token: await getValidGoogleAccessToken() };
}

export async function POST(request: Request) {
  const configuredEvents: Array<{
    platform: TrackingPlatform;
    eventName: string;
    triggerId: string;
    tag: unknown;
  }> = [];
  const errors: string[] = [];
  const failedPlatforms = new Set<TrackingPlatform>();
  const pendingPlatforms: TrackingPlatform[] = [];
  const platformStatuses: Partial<Record<TrackingPlatform, PlatformStatus>> = {};
  let webTagConfigured = false;
  let webTagResult: unknown = null;
  const templateMessages: Array<{ platform: TrackingPlatform; action: string; message: string }> = [];
  const serverGa4ClientVerified = false;
  let webIds: GtmIds | undefined;
  let serverIds: GtmIds | undefined;
  let serverContainerUrl = "";
  let serverMeasurementId = "";
  let selectedPlatforms: TrackingPlatform[] = [];

  try {
    const auth = await authenticate();
    if ("response" in auth) return auth.response;

    let body: Body;
    try {
      const parsed: unknown = await request.json();
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return NextResponse.json({ success: false, error: "Request body must be a JSON object." }, { status: 400 });
      }
      body = parsed as Body;
    } catch {
      return NextResponse.json({ success: false, error: "Request body must be valid JSON." }, { status: 400 });
    }

    const accountId = requiredString(body.accountId, "accountId");
    webIds = {
      accountId,
      containerId: requiredString(body.webContainerId, "webContainerId"),
      workspaceId: requiredString(body.webWorkspaceId, "webWorkspaceId"),
    };
    serverIds = {
      accountId,
      containerId: requiredString(body.serverContainerId, "serverContainerId"),
      workspaceId: requiredString(body.serverWorkspaceId, "serverWorkspaceId"),
    };
    serverContainerUrl = validateServerUrl(requiredString(body.serverContainerUrl, "serverContainerUrl"));
    serverMeasurementId = optionalString(body.serverMeasurementId);

    if (
      !Array.isArray(body.selectedPlatforms) ||
      body.selectedPlatforms.length === 0 ||
      body.selectedPlatforms.some((platform) => typeof platform !== "string" || !ALLOWED_PLATFORMS.includes(platform as TrackingPlatform))
    ) {
      return NextResponse.json({ success: false, error: "Select at least one supported tracking platform." }, { status: 400 });
    }
    selectedPlatforms = [...new Set(body.selectedPlatforms)] as TrackingPlatform[];

    const rawEventNames = Array.isArray(body.eventNames) ? body.eventNames : ["page_view"];
    const eventNames = [...new Set(rawEventNames
      .filter((event): event is string => typeof event === "string")
      .map((event) => event.trim())
      .filter(Boolean))];

    if (eventNames.length === 0 || eventNames.some((event) => !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(event))) {
      return NextResponse.json({
        success: false,
        error: "Event names must start with a letter and contain only letters, numbers, and underscores.",
      }, { status: 400 });
    }

    const token = auth.token;
    const configs = record(body.platformConfigs) as PlatformConfigs;
    const webMeasurementId = optionalString(body.webMeasurementId);

    if (webMeasurementId.length > 10) {
      return NextResponse.json({ success: false, error: "Web Measurement ID cannot exceed 10 characters." }, { status: 400 });
    }
    if (serverMeasurementId.length > 10) {
      return NextResponse.json({ success: false, error: "Server Measurement ID cannot exceed 10 characters." }, { status: 400 });
    }

    // Create/update the Google Tag in the SELECTED WEB workspace. This is
    // intentionally independent of the Server workspace IDs.
    if (webMeasurementId) {
      try {
        webTagResult = await configureWebGtag(
          token,
          webIds,
          webMeasurementId,
          serverContainerUrl,
          selectedPlatforms
        );
        webTagConfigured = true;
      } catch (error) {
        errors.push(`Web Google Tag: ${errorMessage(error)}`);
      }
    }

    // The Server GA4 tag can be attempted without a separate client pre-check.
    // GTM may still reject unsupported Measurement ID values when saving the tag.
    if (selectedPlatforms.includes("kp_ga4")) {
      if (!serverMeasurementId) {
        failedPlatforms.add("kp_ga4");
        errors.push("GA4: Enter a Server GA4 Measurement ID. This app does not enforce its format, but GTM may reject unsupported values.");
      }
    }

    for (const platform of ["kp_ga4", "meta", "linkedin", "tiktok"] as const) {
      if (!selectedPlatforms.includes(platform)) continue;

      // Import/reuse the official custom template before trying to create tags.
      // GA4 uses GTM's built-in sgtmgaaw tag type and needs no gallery template.
      if (platform === "meta" || platform === "linkedin" || platform === "tiktok") {
        try {
          const templateResult = await ensureServerPlatformTemplate(token, serverIds, platform);
          templateMessages.push({
            platform,
            action: templateResult.action,
            message: templateResult.message,
          });
          console.info(`[GTM automation] ${PLATFORM_LABELS[platform]} template ${templateResult.action}:`, templateResult);
        } catch (error) {
          failedPlatforms.add(platform);
          const message = `${PLATFORM_LABELS[platform]} template installation failed: ${errorMessage(error)}`;
          errors.push(message);
          platformStatuses[platform] = { status: "failed", message };
          continue;
        }
      }

      const configuredForPlatform: string[] = [];
      for (const eventName of eventNames) {
        try {
          const trigger = await getOrCreateServerEventTrigger(token, serverIds, eventName);
          if (!trigger.triggerId) throw new Error(`No trigger ID returned for "${eventName}".`);

          let tag: unknown;
          if (platform === "kp_ga4") {
            tag = await configureServerGa4EventTag(token, serverIds, eventName, trigger.triggerId, serverMeasurementId);
          } else if (platform === "meta") {
            const metaConfig = record(configs.meta);
            tag = await configureServerMetaEventTag(token, serverIds, eventName, trigger.triggerId, {
              pixelId: optionalString(metaConfig.pixelId),
              accessToken: optionalString(metaConfig.accessToken),
              testEventCode: optionalString(metaConfig.testEventCode),
            });
          } else if (platform === "linkedin") {
            const linkedinConfig = record(configs.linkedin);
            tag = await configureServerLinkedInEventTag(token, serverIds, eventName, trigger.triggerId, {
              accessToken: optionalString(linkedinConfig.accessToken),
              partnerId: optionalString(linkedinConfig.partnerId),
              conversionRuleId: optionalString(linkedinConfig.conversionRuleId),
            });
          } else {
            const tiktokConfig = record(configs.tiktok);
            tag = await configureServerTikTokEventTag(token, serverIds, eventName, trigger.triggerId, {
              pixelId: optionalString(tiktokConfig.pixelId),
              accessToken: optionalString(tiktokConfig.accessToken),
              testEventCode: optionalString(tiktokConfig.testEventCode),
            });
          }

          configuredForPlatform.push(eventName);
          configuredEvents.push({ platform, eventName, triggerId: trigger.triggerId, tag });
        } catch (error) {
          failedPlatforms.add(platform);
          errors.push(`${PLATFORM_LABELS[platform]} (${eventName}): ${errorMessage(error)}`);
        }
      }

      if (failedPlatforms.has(platform)) {
        platformStatuses[platform] = {
          status: "failed",
          message: `One or more ${PLATFORM_LABELS[platform]} events failed to configure.`,
          configuredEvents: configuredForPlatform,
        };
      } else {
        platformStatuses[platform] = {
          status: "completed",
          message: `${PLATFORM_LABELS[platform]} events configured.`,
          configuredEvents: configuredForPlatform,
        };
      }
    }

    for (const platform of failedPlatforms) {
      platformStatuses[platform] ??= { status: "failed", message: `${PLATFORM_LABELS[platform]} configuration failed.` };
    }

    const allSelectedPlatformsCompleted = selectedPlatforms.every((platform) => platformStatuses[platform]?.status === "completed");
    const partial = pendingPlatforms.length > 0 || failedPlatforms.size > 0 || errors.length > 0;

    return NextResponse.json({
      success: allSelectedPlatformsCompleted && errors.length === 0,
      partial,
      published: false,
      message: allSelectedPlatformsCompleted
        ? "All selected platform configurations have been saved to the GTM workspace."
        : "Some selected platform configurations are pending or failed. Review platformStatuses and errors.",
      containers: { web: webIds, server: serverIds, serverContainerUrl },
      selectedPlatforms,
      platformStatuses,
      ga4: {
        selected: selectedPlatforms.includes("kp_ga4"),
        serverMeasurementId,
        configuredEvents: configuredEvents.filter((event) => event.platform === "kp_ga4"),
      },
      webTag: webTagResult,
      templateMessages,
      verification: { serverGa4ClientVerified, webTagConfigured },
      pendingPlatforms,
      failedPlatforms: [...failedPlatforms],
      errors,
      configuredEvents,
      nextSteps: [
        ...(!webMeasurementId
          ? ["Web Google Tag was skipped because no Web Measurement ID was supplied."]
          : !webTagConfigured
            ? ["Web Google Tag could not be saved. Check the Web GTM workspace and errors."]
            : []),
        "Meta, LinkedIn, and TikTok official server-side templates are imported automatically when selected, where the GTM Gallery API allows the import.",
        "Provide the required platform credentials before expecting events to be delivered; template installation alone does not send events.",
        "Review the affected GTM workspaces and test in GTM Preview before publishing.",
      ],
    }, { status: partial ? 207 : 200 });
  } catch (error) {
    console.error("GTM Configure All error:", error);
    return NextResponse.json({
      success: false,
      partial: webTagConfigured || configuredEvents.length > 0,
      published: false,
      error: errorMessage(error),
      selectedPlatforms,
      configuredEvents,
      templateMessages,
      webTag: webTagResult,
      failedPlatforms: [...failedPlatforms],
      errors,
      ...(webIds && serverIds ? { containers: { web: webIds, server: serverIds, serverContainerUrl } } : {}),
    }, { status: webIds && serverIds ? 500 : 400 });
  }
}

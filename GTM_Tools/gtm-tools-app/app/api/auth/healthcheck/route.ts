import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/healthcheck/engine";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, containerId, workspaceId } = body;

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    // ✅ Fetch Full Tags
    const tagsRes = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // ✅ Fetch Full Triggers
    const triggersRes = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // ✅ Fetch Full Variables
    const variablesRes = await fetch(
      `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!tagsRes.ok || !triggersRes.ok || !variablesRes.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch GTM data",
          tagsStatus: tagsRes.status,
          triggersStatus: triggersRes.status,
          variablesStatus: variablesRes.status,
        },
        { status: 500 }
      );
    }

    const tagsJson = await tagsRes.json();
    const triggersJson = await triggersRes.json();
    const variablesJson = await variablesRes.json();

    const tags = tagsJson.tag || [];
    const triggers = triggersJson.trigger || [];
    const variables = variablesJson.variable || [];

    // ✅ Run healthcheck
    const report = runHealthCheck({
      tags,
      triggers,
      variables,
      accountId,
      containerId,
      workspaceId,
    });

    // =====================================================
    // ✅ FIX: Normalize affected items for UI
    // =====================================================
    const normalizedResults = (report.results || []).map((r: any) => {
      const normalize = (arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((x) => {
          if (typeof x === "string") return { name: x };
          if (x?.name) return { name: x.name };
          return { name: JSON.stringify(x) };
        });
      };

      return {
        ...r,
        affectedTags: normalize(r.affectedTags),
        affectedTriggers: normalize(r.affectedTriggers),
        affectedVariables: normalize(r.affectedVariables),
      };
    });

    return NextResponse.json({
      ...report,
      results: normalizedResults,
    });
  } catch (error) {
    console.error("HealthCheck API Error:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { runHealthCheck } from "@/lib/healthcheck/engine";
// import { getValidGoogleAccessToken } from "@/lib/googleAuth";
// import { GTMTag, GTMTrigger, GTMVariable } from "@/lib/healthcheck/types";

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { accountId, containerId, workspaceId } = body;

//     if (!accountId || !containerId || !workspaceId) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     const accessToken = await getValidGoogleAccessToken();

//     const baseUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`;

//     const tagsRes = await fetch(`${baseUrl}/tags`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     const triggersRes = await fetch(`${baseUrl}/triggers`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     const variablesRes = await fetch(`${baseUrl}/variables`, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!tagsRes.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch tags", details: await tagsRes.json() },
//         { status: tagsRes.status }
//       );
//     }

//     if (!triggersRes.ok) {
//       return NextResponse.json(
//         { error: "Failed to fetch triggers", details: await triggersRes.json() },
//         { status: triggersRes.status }
//       );
//     }

//     if (!variablesRes.ok) {
//       return NextResponse.json(
//         {
//           error: "Failed to fetch variables",
//           details: await variablesRes.json(),
//         },
//         { status: variablesRes.status }
//       );
//     }

//     const tagsJson = await tagsRes.json();
//     const triggersJson = await triggersRes.json();
//     const variablesJson = await variablesRes.json();

//     // ✅ FULL GTM OBJECTS
//     const tags: GTMTag[] = (tagsJson.tag || []) as GTMTag[];
//     const triggers: GTMTrigger[] = (triggersJson.trigger || []) as GTMTrigger[];
//     const variables: GTMVariable[] = (variablesJson.variable || []) as GTMVariable[];

//     const report = runHealthCheck({
//       tags,
//       triggers,
//       variables,
//     });

//     return NextResponse.json({
//       success: true,
//       ...report,
//       meta: {
//         tagsCount: tags.length,
//         triggersCount: triggers.length,
//         variablesCount: variables.length,
//       },
//     });
//   } catch (error) {
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
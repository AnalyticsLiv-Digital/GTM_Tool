import { NextResponse } from "next/server";
import { getValidGoogleAccessToken } from "@/lib/googleAuth";

// export async function POST(req: Request) {
//   try {
//     const accessToken = await getValidGoogleAccessToken();

//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Access token missing. Please login again." },
//         { status: 401 }
//       );
//     }

//     const body = await req.json();
//     const { accountId, containerId, workspaceId, template } = body;

//     if (!accountId || !containerId || !workspaceId || !template) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, template required" },
//         { status: 400 }
//       );
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;

//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name: template.name,
//         templateData: template.templateData || "",
//       }),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to export template", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true, template: data });
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

export async function POST(req: Request) {
  try {
    const accessToken = await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token missing. Please login again." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { accountId, containerId, workspaceId, template } = body;

    if (!accountId || !containerId || !workspaceId || !template) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId, template required" },
        { status: 400 }
      );
    }

    // FIX: template is coming as array
    const selectedTemplate = Array.isArray(template) ? template[0] : template;

    if (!selectedTemplate.templateData) {
      return NextResponse.json(
        { error: "templateData missing in template object" },
        { status: 400 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: selectedTemplate.name,
        templateData: selectedTemplate.templateData,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to export template", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, template: data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
// ======================================================
// GET Templates
// ======================================================
export async function GET(req: Request) {
  try {
    const accessToken = await getValidGoogleAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing Google access token" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId");
    const containerId = url.searchParams.get("containerId");
    const workspaceId = url.searchParams.get("workspaceId");

    if (!accountId || !containerId || !workspaceId) {
      return NextResponse.json(
        { error: "accountId, containerId, workspaceId required" },
        { status: 400 }
      );
    }

    const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch templates", details: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ template: data.template || [] });
  } catch (err) {
    console.error("Templates GET Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";

// async function getAccessToken() {
//   return (await cookies()).get("google_access_token")?.value;
// }


// // ======================================================
// // CREATE Template
// // ======================================================
// export async function POST(req: Request) {
//   try {
//     const accessToken = await getAccessToken();
//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Missing Google access token" },
//         { status: 401 }
//       );
//     }

//     const body = await req.json();
//     const { accountId, containerId, workspaceId, template } = body;

//     if (!accountId || !containerId || !workspaceId || !template) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, template required" },
//         { status: 400 }
//       );
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates`;

//     const res = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(template),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to create template", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json(data);
//   } catch (err) {
//     console.error("Templates POST Error:", err);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// // ======================================================
// // UPDATE Template
// // ======================================================
// export async function PUT(req: Request) {
//   try {
//     const accessToken = await getAccessToken();
//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Missing Google access token" },
//         { status: 401 }
//       );
//     }

//     const body = await req.json();
//     const { accountId, containerId, workspaceId, templateId, template } = body;

//     if (!accountId || !containerId || !workspaceId || !templateId || !template) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, templateId, template required" },
//         { status: 400 }
//       );
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates/${templateId}`;

//     const res = await fetch(apiUrl, {
//       method: "PUT",
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(template),
//     });

//     const data = await res.json();

//     if (!res.ok) {
//       return NextResponse.json(
//         { error: "Failed to update template", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json(data);
//   } catch (err) {
//     console.error("Templates PUT Error:", err);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }

// // ======================================================
// // DELETE Template
// // ======================================================
// export async function DELETE(req: Request) {
//   try {
//     const accessToken = await getAccessToken();
//     if (!accessToken) {
//       return NextResponse.json(
//         { error: "Missing Google access token" },
//         { status: 401 }
//       );
//     }

//     const url = new URL(req.url);

//     const accountId = url.searchParams.get("accountId");
//     const containerId = url.searchParams.get("containerId");
//     const workspaceId = url.searchParams.get("workspaceId");
//     const templateId = url.searchParams.get("templateId");

//     if (!accountId || !containerId || !workspaceId || !templateId) {
//       return NextResponse.json(
//         { error: "accountId, containerId, workspaceId, templateId required" },
//         { status: 400 }
//       );
//     }

//     const apiUrl = `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/templates/${templateId}`;

//     const res = await fetch(apiUrl, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     if (!res.ok) {
//       const data = await res.json();
//       return NextResponse.json(
//         { error: "Failed to delete template", details: data },
//         { status: res.status }
//       );
//     }

//     return NextResponse.json({ success: true });
//   } catch (err) {
//     console.error("Templates DELETE Error:", err);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }
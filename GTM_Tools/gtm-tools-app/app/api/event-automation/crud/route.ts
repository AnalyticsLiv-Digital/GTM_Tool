import {
  NextResponse,
} from "next/server";

import {
  getValidGoogleAccessToken,
} from "@/lib/googleAuth";


// =====================================================
// GTM URL
// =====================================================

function workspaceUrl(
  accountId: string,
  containerId: string,
  workspaceId: string,
  resource: string,
  resourceId?: string
): string {
  const base =
    `https://tagmanager.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/${resource}`;

  return resourceId
    ? `${base}/${resourceId}`
    : base;
}


// =====================================================
// REQUEST TO GTM
// =====================================================

async function gtmFetch(
  url: string,
  accessToken: string,
  options: RequestInit = {}
) {
  return fetch(
    url,
    {
      ...options,

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",

        ...(options.headers ?? {}),
      },
    }
  );
}


// =====================================================
// VALIDATE BODY
// =====================================================

function validateBody(
  body: Record<string, unknown>
): string | null {
  if (
    !body.accountId ||
    !body.containerId ||
    !body.workspaceId
  ) {
    return (
      "accountId, containerId and workspaceId are required"
    );
  }

  return null;
}


// =====================================================
// GET
// =====================================================

export async function GET(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const accountId =
      searchParams.get(
        "accountId"
      );

    const containerId =
      searchParams.get(
        "containerId"
      );

    const workspaceId =
      searchParams.get(
        "workspaceId"
      );

    const resource =
      searchParams.get(
        "resource"
      );

    if (
      !accountId ||
      !containerId ||
      !workspaceId ||
      !resource
    ) {
      return NextResponse.json(
        {
          error:
            "accountId, containerId, workspaceId and resource are required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "tags",
        "triggers",
        "variables",
      ].includes(resource)
    ) {
      return NextResponse.json(
        {
          error:
            "resource must be tags, triggers or variables",
        },
        {
          status: 400,
        }
      );
    }

    const accessToken =
      await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Missing Google access token",
        },
        {
          status: 401,
        }
      );
    }

    const response =
      await gtmFetch(
        workspaceUrl(
          accountId,
          containerId,
          workspaceId,
          resource
        ),
        accessToken
      );

    const data =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            `Failed to fetch ${resource}`,
          details: data,
        },
        {
          status:
            response.status,
        }
      );
    }

    return NextResponse.json(
      data
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}


// =====================================================
// POST = CREATE
// =====================================================

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const validation =
      validateBody(
        body
      );

    if (validation) {
      return NextResponse.json(
        {
          error:
            validation,
        },
        {
          status: 400,
        }
      );
    }

    const {
      accountId,
      containerId,
      workspaceId,
      resource,
      data,
    } = body;

    if (
      ![
        "tags",
        "triggers",
        "variables",
      ].includes(resource)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid resource",
        },
        {
          status: 400,
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "data is required",
        },
        {
          status: 400,
        }
      );
    }

    const accessToken =
      await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Missing Google access token",
        },
        {
          status: 401,
        }
      );
    }

    const response =
      await gtmFetch(
        workspaceUrl(
          accountId,
          containerId,
          workspaceId,
          resource
        ),
        accessToken,
        {
          method:
            "POST",

          body:
            JSON.stringify(
              data
            ),
        }
      );

    const result =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            `Failed to create ${resource}`,
          details:
            result,
        },
        {
          status:
            response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,

      [resource]:
        result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}


// =====================================================
// PUT = UPDATE
// =====================================================

export async function PUT(
  request: Request
) {
  try {
    const body =
      await request.json();

    const validation =
      validateBody(
        body
      );

    if (validation) {
      return NextResponse.json(
        {
          error:
            validation,
        },
        {
          status: 400,
        }
      );
    }

    const {
      accountId,
      containerId,
      workspaceId,
      resource,
      resourceId,
      data,
    } = body;

    if (
      ![
        "tags",
        "triggers",
        "variables",
      ].includes(resource)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid resource",
        },
        {
          status: 400,
        }
      );
    }

    if (!resourceId) {
      return NextResponse.json(
        {
          error:
            "resourceId is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "data is required",
        },
        {
          status: 400,
        }
      );
    }

    const accessToken =
      await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Missing Google access token",
        },
        {
          status: 401,
        }
      );
    }

    const response =
      await gtmFetch(
        workspaceUrl(
          accountId,
          containerId,
          workspaceId,
          resource,
          resourceId
        ),
        accessToken,
        {
          method:
            "PUT",

          body:
            JSON.stringify(
              data
            ),
        }
      );

    const result =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            `Failed to update ${resource}`,
          details:
            result,
        },
        {
          status:
            response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,

      [resource]:
        result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}


// =====================================================
// DELETE
// =====================================================

export async function DELETE(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const accountId =
      searchParams.get(
        "accountId"
      );

    const containerId =
      searchParams.get(
        "containerId"
      );

    const workspaceId =
      searchParams.get(
        "workspaceId"
      );

    const resource =
      searchParams.get(
        "resource"
      );

    const resourceId =
      searchParams.get(
        "resourceId"
      );

    if (
      !accountId ||
      !containerId ||
      !workspaceId ||
      !resource ||
      !resourceId
    ) {
      return NextResponse.json(
        {
          error:
            "accountId, containerId, workspaceId, resource and resourceId are required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "tags",
        "triggers",
        "variables",
      ].includes(resource)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid resource",
        },
        {
          status: 400,
        }
      );
    }

    const accessToken =
      await getValidGoogleAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Missing Google access token",
        },
        {
          status: 401,
        }
      );
    }

    const response =
      await gtmFetch(
        workspaceUrl(
          accountId,
          containerId,
          workspaceId,
          resource,
          resourceId
        ),
        accessToken,
        {
          method:
            "DELETE",
        }
      );

    if (!response.ok) {
      const result =
        await response
          .json()
          .catch(
            () => ({})
          );

      return NextResponse.json(
        {
          error:
            `Failed to delete ${resource}`,
          details:
            result,
        },
        {
          status:
            response.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
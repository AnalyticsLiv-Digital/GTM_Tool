import {
  NextResponse,
} from "next/server";

import {
  buildAutomation,
  validateAutomation,
} from "@/lib/event-automation/automation-engine";

import type {
  EventSchemaRow,
} from "@/lib/event-automation/types";


// =====================================================
// POST
// =====================================================

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const events =
      body.events as
        | EventSchemaRow[]
        | undefined;

    if (
      !Array.isArray(events)
    ) {
      return NextResponse.json(
        {
          error:
            "events must be an array",
        },
        {
          status: 400,
        }
      );
    }

    const automation =
      buildAutomation(
        events
      );

    const errors =
      validateAutomation(
        automation
      );

    if (errors.length) {
      return NextResponse.json(
        {
          error:
            "Automation validation failed",
          details: errors,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,

      automation,
    });
  } catch (error) {
    console.error(
      "Event Automation Generate Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate automation",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextResponse } from "next/server";
import { forwardToBackend } from "../../../_lib/forwardBackend";

const pathByAction: Record<string, string> = {
  profile: "/api/profile",
  "future-simulate": "/api/future-simulate",
  "skill-gap": "/api/skill-gap",
  roadmap: "/api/roadmap",
  "future-chat": "/api/future-chat",
  "career-trends": "/api/career-trends",
  "reality-check": "/api/reality-check",
};

function getPath(action: string) {
  return pathByAction[action] || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const path = getPath(action);

  if (!path) {
    return NextResponse.json(
      { success: false, error: `Unknown FutureOS action: ${action}` },
      { status: 404 },
    );
  }

  if (action !== "career-trends") {
    return NextResponse.json(
      { success: false, error: `GET is not supported for ${action}` },
      { status: 405 },
    );
  }

  return forwardToBackend(request, path, "GET");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const path = getPath(action);

  if (!path) {
    return NextResponse.json(
      { success: false, error: `Unknown FutureOS action: ${action}` },
      { status: 404 },
    );
  }

  if (action === "career-trends") {
    return NextResponse.json(
      { success: false, error: "POST is not supported for career-trends" },
      { status: 405 },
    );
  }

  return forwardToBackend(request, path, "POST");
}

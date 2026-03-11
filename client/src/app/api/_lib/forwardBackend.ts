import { NextResponse } from "next/server";
import { SERVER_URL } from "@/utils/commonHelper";

type Method = "GET" | "POST";

export async function forwardToBackend(
  request: Request,
  path: string,
  method: Method,
) {
  try {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const targetUrl = `${SERVER_URL}${normalizedPath}`;
    const auth = request.headers.get("Authorization");
    const headers: Record<string, string> = {};

    if (auth) {
      headers.Authorization = auth;
    }

    let body: string | undefined;
    if (method !== "GET") {
      const contentType = request.headers.get("Content-Type");
      const rawBody = await request.text();
      if (rawBody) {
        body = rawBody;
      }

      if (contentType) {
        headers["Content-Type"] = contentType;
      } else if (body) {
        headers["Content-Type"] = "application/json";
      }
    }

    const response = await fetch(targetUrl, {
      method,
      headers,
      ...(body ? { body } : {}),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed, { status: response.status });
      } catch (_) {
        return NextResponse.json(
          {
            success: false,
            error: text,
          },
          { status: response.status },
        );
      }
    }

    return NextResponse.json(
      {
        success: response.ok,
      },
      { status: response.status },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal proxy error",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: "ok",
      platform: "ARBE DesignFit Studio",
      version: process.env.APP_VERSION ?? "development",
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      decisionEngine: "available",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

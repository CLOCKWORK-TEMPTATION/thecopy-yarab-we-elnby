import { NextResponse } from "next/server";
import { withNoStoreResponseInit } from "@/lib/server/no-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "web",
      timestamp: new Date().toISOString(),
    },
    withNoStoreResponseInit()
  );
}

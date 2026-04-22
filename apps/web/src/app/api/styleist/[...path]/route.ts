import { NextRequest, NextResponse } from "next/server";
import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetPath(path: string[]): string {
  return `/api/styleist/${path.join("/")}`;
}

async function respond(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  try {
    return await proxyToBackend(request, getTargetPath(path));
  } catch (error) {
    return buildProxyErrorResponse(error, "تعذر الاتصال بخدمة StyleIST");
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return respond(request, path);
}

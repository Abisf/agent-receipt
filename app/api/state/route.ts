import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getSnapshot());
}

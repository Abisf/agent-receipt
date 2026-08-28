import { NextResponse } from "next/server";
import { resetStore, getSnapshot } from "@/lib/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetStore();
  return NextResponse.json(getSnapshot());
}

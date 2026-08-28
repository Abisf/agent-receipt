import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/state";
import { undoReceipt } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { receiptId?: string };
    if (!body.receiptId) {
      return NextResponse.json({ error: "receiptId is required" }, { status: 400 });
    }
    const receipt = undoReceipt(body.receiptId);
    return NextResponse.json({ snapshot: getSnapshot(), receipt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Undo failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

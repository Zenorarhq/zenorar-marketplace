import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  await db.query("SELECT 1");
  return NextResponse.json({ ok: true });
}

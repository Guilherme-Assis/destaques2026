import { NextResponse } from "next/server";
import { newCaptcha } from "@/lib/captcha";

export async function GET() {
  return NextResponse.json(newCaptcha(), {
    headers: { "Cache-Control": "no-store" },
  });
}

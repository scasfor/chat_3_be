import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminAuth } from "@/lib/apiAuth";
import { GEMINI_API_KEY_SETTING, getSetting, setSetting } from "@/lib/settings";

export const GET = withAdminAuth(async () => {
  const geminiApiKey = await getSetting(GEMINI_API_KEY_SETTING);
  return NextResponse.json({ geminiApiKey: geminiApiKey ?? "" });
});

const schema = z.object({ geminiApiKey: z.string().nullable() });

export const PUT = withAdminAuth(async (request: NextRequest) => {
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ message: "Validation failed" }, { status: 422 });
  }

  await setSetting(GEMINI_API_KEY_SETTING, parsed.data.geminiApiKey || null);

  return NextResponse.json({ success: true });
});

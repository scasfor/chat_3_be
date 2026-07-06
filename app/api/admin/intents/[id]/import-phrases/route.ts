import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiAuth";
import { importPhrasesFromExcel } from "@/lib/intentImporter";

export const POST = withAdminAuth(async (request: NextRequest, context) => {
  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file uploaded." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const imported = await importPhrasesFromExcel(Number(id), buffer);

  return NextResponse.json({ imported });
});

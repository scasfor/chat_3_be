import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiAuth";
import { importIntentsFromExcel } from "@/lib/intentImporter";

export const POST = withAdminAuth(async (request: NextRequest) => {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file uploaded." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importIntentsFromExcel(buffer);

  return NextResponse.json(result);
});

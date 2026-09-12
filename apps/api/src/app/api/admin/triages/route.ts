import type { NextRequest } from "next/server";
import { handleAdminTriages } from "../../../../functions/admin-triages";

export async function GET(request: NextRequest) {
  return handleAdminTriages(request);
}

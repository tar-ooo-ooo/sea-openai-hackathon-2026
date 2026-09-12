import { handleGetCase } from "../../../../functions/user-cases/get-case.ts";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleGetCase(request, (await context.params).id, "case");
}

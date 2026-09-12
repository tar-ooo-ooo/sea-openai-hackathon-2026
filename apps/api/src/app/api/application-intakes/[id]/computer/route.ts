import { handleOpenApplicationComputer } from "../../../../../functions/application-intakes/index.ts";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return handleOpenApplicationComputer(request, (await context.params).id);
}

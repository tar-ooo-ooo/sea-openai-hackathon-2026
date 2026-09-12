import {
  handleGetApplicationIntake,
  handleSubmitApplicationIntake,
} from "../../../../functions/application-intakes/index.ts";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return handleGetApplicationIntake(request, (await context.params).id);
}

export async function POST(request: Request, context: Context) {
  return handleSubmitApplicationIntake(request, (await context.params).id);
}

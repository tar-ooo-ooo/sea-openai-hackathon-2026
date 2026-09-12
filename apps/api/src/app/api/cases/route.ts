import { handleListCases } from "../../../functions/user-cases/list-cases.ts";

export async function GET(request: Request) {
  return handleListCases(request);
}

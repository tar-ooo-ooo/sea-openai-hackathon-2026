import { handleHistory } from "../../../../functions/chat/handle-history.ts";

export async function GET(request: Request) {
  return handleHistory(request);
}

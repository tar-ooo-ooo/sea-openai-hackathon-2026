import { handleProfile } from "../../../functions/profile/index.ts";

export async function GET(request: Request) { return handleProfile(request); }
export async function PUT(request: Request) { return handleProfile(request); }

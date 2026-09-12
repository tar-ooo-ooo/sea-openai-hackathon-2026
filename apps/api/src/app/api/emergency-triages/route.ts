import { handleEmergencyTriage } from "../../../functions/emergency-triages/index.ts";

export async function POST(request: Request) { return handleEmergencyTriage(request); }

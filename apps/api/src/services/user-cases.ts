import { and, asc, desc, eq } from "drizzle-orm";
import { applicationIntakes, applicationPackages, applicationServices, careCases } from "./db/schema.ts";

export async function listUserCaseRows(userId: string, id?: string) {
  const { db } = await import("./db/client.ts");
  const [drafts, packages] = await Promise.all([
    db.select({ id: applicationIntakes.id, data: applicationIntakes.data, updatedAt: applicationIntakes.updatedAt })
      .from(applicationIntakes)
      .where(and(eq(applicationIntakes.userId, userId), eq(applicationIntakes.status, "collecting"), id ? eq(applicationIntakes.id, id) : undefined))
      .orderBy(desc(applicationIntakes.updatedAt), desc(applicationIntakes.id)),
    db.select({
      id: applicationPackages.id, targetName: applicationPackages.targetName,
      summary: applicationPackages.summary, createdAt: applicationPackages.createdAt,
      updatedAt: applicationPackages.updatedAt,
      caseStatus: careCases.status,
      service: {
        id: applicationServices.id, position: applicationServices.position,
        category: applicationServices.category, name: applicationServices.name,
        reason: applicationServices.reason, status: applicationServices.status,
      },
    }).from(applicationPackages)
      .leftJoin(applicationServices, eq(applicationServices.applicationPackageId, applicationPackages.id))
      .leftJoin(careCases, eq(careCases.sourceApplicationPackageId, applicationPackages.id))
      .where(and(eq(applicationPackages.userId, userId), id ? eq(applicationPackages.id, id) : undefined))
      .orderBy(desc(applicationPackages.updatedAt), desc(applicationPackages.id), asc(applicationServices.position)),
  ]);
  return { drafts, packages };
}

export async function findCaseCareData(userId: string, packageId: string) {
  const { db } = await import("./db/client.ts");
  const [intake] = await db.select({ data: applicationIntakes.data }).from(applicationIntakes)
    .where(and(eq(applicationIntakes.userId, userId), eq(applicationIntakes.applicationPackageId, packageId), eq(applicationIntakes.status, "packaged")))
    .orderBy(desc(applicationIntakes.updatedAt), desc(applicationIntakes.id)).limit(1);
  return intake?.data;
}

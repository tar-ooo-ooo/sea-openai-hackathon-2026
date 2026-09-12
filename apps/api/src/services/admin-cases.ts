import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "./db/client.ts";
import { applicationIntakes, applicationPackages, applicationServices } from "./db/schema.ts";

export async function listAdminCases() {
  return db
    .select({
      id: applicationPackages.id,
      targetName: applicationPackages.targetName,
      summary: applicationPackages.summary,
      serviceCount: count(applicationServices.id),
      createdAt: applicationPackages.createdAt,
      updatedAt: applicationPackages.updatedAt,
    })
    .from(applicationPackages)
    .leftJoin(
      applicationServices,
      eq(applicationServices.applicationPackageId, applicationPackages.id),
    )
    .groupBy(
      applicationPackages.id,
      applicationPackages.targetName,
      applicationPackages.summary,
      applicationPackages.createdAt,
      applicationPackages.updatedAt,
    )
    .orderBy(desc(applicationPackages.updatedAt));
}

export async function findAdminCaseById(caseId: string) {
  const [applicationPackage] = await db
    .select({
      id: applicationPackages.id,
      targetName: applicationPackages.targetName,
      summary: applicationPackages.summary,
      createdAt: applicationPackages.createdAt,
      updatedAt: applicationPackages.updatedAt,
    })
    .from(applicationPackages)
    .where(eq(applicationPackages.id, caseId))
    .limit(1);

  if (!applicationPackage) return null;

  const services = await db
    .select({
      id: applicationServices.id,
      position: applicationServices.position,
      category: applicationServices.category,
      name: applicationServices.name,
      reason: applicationServices.reason,
      status: applicationServices.status,
    })
    .from(applicationServices)
    .where(eq(applicationServices.applicationPackageId, caseId))
    .orderBy(asc(applicationServices.position));

  const [intake] = await db
    .select({ id: applicationIntakes.id, data: applicationIntakes.data, updatedAt: applicationIntakes.updatedAt })
    .from(applicationIntakes)
    .innerJoin(applicationPackages, and(
      eq(applicationIntakes.applicationPackageId, applicationPackages.id),
      eq(applicationIntakes.userId, applicationPackages.userId),
    ))
    .where(eq(applicationPackages.id, caseId))
    .orderBy(desc(applicationIntakes.updatedAt), asc(applicationIntakes.id))
    .limit(1);

  return { ...applicationPackage, services, intake: intake ?? null };
}

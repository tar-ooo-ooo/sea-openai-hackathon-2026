import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type {
  ApplicationIntakeData,
  ApplicationServiceOption,
} from "../types/application-intake.ts";
import { db } from "./db/client.ts";
import {
  applicationIntakes,
  applicationPackages,
  applicationServices,
} from "./db/schema.ts";

export async function findCollectingApplicationIntake(userId: string) {
  const [intake] = await db
    .select()
    .from(applicationIntakes)
    .where(
      and(eq(applicationIntakes.userId, userId), eq(applicationIntakes.status, "collecting")),
    )
    .orderBy(desc(applicationIntakes.createdAt))
    .limit(1);

  return intake;
}

export async function findLatestPackagedApplicationIntake(userId: string) {
  const [intake] = await db
    .select()
    .from(applicationIntakes)
    .where(and(eq(applicationIntakes.userId, userId), eq(applicationIntakes.status, "packaged")))
    .orderBy(desc(applicationIntakes.updatedAt))
    .limit(1);

  return intake;
}

export async function findApplicationIntake(id: string, userId: string) {
  const [intake] = await db
    .select()
    .from(applicationIntakes)
    .where(and(eq(applicationIntakes.id, id), eq(applicationIntakes.userId, userId)))
    .limit(1);

  return intake;
}

export async function createApplicationIntake(userId: string) {
  const [intake] = await db.insert(applicationIntakes).values({ userId }).returning();
  return intake;
}

export async function updateApplicationIntake(
  id: string,
  userId: string,
  data: ApplicationIntakeData,
) {
  const [intake] = await db
    .update(applicationIntakes)
    .set({ data, updatedAt: new Date() })
    .where(and(eq(applicationIntakes.id, id), eq(applicationIntakes.userId, userId)))
    .returning();
  return intake;
}

export async function createApplicationPackage(input: {
  intakeId: string;
  userId: string;
  targetName: string;
  summary: string;
  services: Array<{
    category:
      | "照顧及專業服務"
      | "交通接送服務"
      | "輔具及居家無障礙環境改善"
      | "喘息服務";
    name: ApplicationServiceOption;
    reason: string;
  }>;
}) {
  const packageId = randomUUID();
  await db.batch([
    db.insert(applicationPackages).values({
      id: packageId,
      userId: input.userId,
      targetName: input.targetName,
      summary: input.summary,
    }),
    db.insert(applicationServices).values(
      input.services.map((service, position) => ({
        applicationPackageId: packageId,
        position,
        ...service,
      })),
    ),
    db
      .update(applicationIntakes)
      .set({
        status: "packaged",
        applicationPackageId: packageId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationIntakes.id, input.intakeId),
          eq(applicationIntakes.userId, input.userId),
        ),
      ),
  ]);
  return packageId;
}

export async function replaceApplicationPackage(input: {
  intakeId: string;
  applicationPackageId: string;
  userId: string;
  data: ApplicationIntakeData;
  targetName: string;
  summary: string;
  services: Array<{
    category:
      | "照顧及專業服務"
      | "交通接送服務"
      | "輔具及居家無障礙環境改善"
      | "喘息服務";
    name: ApplicationServiceOption;
    reason: string;
  }>;
}) {
  const existingServices = await db
    .select({ name: applicationServices.name, status: applicationServices.status })
    .from(applicationServices)
    .where(eq(applicationServices.applicationPackageId, input.applicationPackageId));
  const statusByName = new Map(existingServices.map(({ name, status }) => [name, status]));

  await db.batch([
    db
      .update(applicationIntakes)
      .set({ data: input.data, updatedAt: new Date() })
      .where(
        and(
          eq(applicationIntakes.id, input.intakeId),
          eq(applicationIntakes.userId, input.userId),
        ),
      ),
    db
      .update(applicationPackages)
      .set({
        targetName: input.targetName,
        summary: input.summary,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationPackages.id, input.applicationPackageId),
          eq(applicationPackages.userId, input.userId),
        ),
      ),
    db
      .delete(applicationServices)
      .where(eq(applicationServices.applicationPackageId, input.applicationPackageId)),
    db.insert(applicationServices).values(
      input.services.map((service, position) => ({
        applicationPackageId: input.applicationPackageId,
        position,
        status: statusByName.get(service.name) ?? "尚未申請",
        ...service,
      })),
    ),
  ]);
}

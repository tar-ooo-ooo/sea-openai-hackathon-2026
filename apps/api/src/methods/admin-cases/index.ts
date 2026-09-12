import type { AdminCaseDetail, AdminCaseListItem } from "../../types/admin-case.ts";
import { findAdminCaseById, listAdminCases } from "../../services/admin-cases.ts";
import { formatApplicationSections } from "./application-sections.ts";

function _toListItem(applicationPackage: {
  id: string;
  targetName: string;
  summary: string;
  serviceCount: number;
  createdAt: Date;
  updatedAt: Date;
}): AdminCaseListItem {
  return {
    id: applicationPackage.id,
    targetName: applicationPackage.targetName,
    summary: applicationPackage.summary,
    serviceCount: applicationPackage.serviceCount,
    createdAt: applicationPackage.createdAt.toISOString(),
    updatedAt: applicationPackage.updatedAt.toISOString(),
  };
}

export async function getAdminCases(): Promise<AdminCaseListItem[]> {
  return (await listAdminCases()).map(_toListItem);
}

export async function getAdminCase(caseId: string): Promise<AdminCaseDetail | null> {
  const applicationPackage = await findAdminCaseById(caseId);
  if (!applicationPackage) return null;

  return {
    ..._toListItem({ ...applicationPackage, serviceCount: applicationPackage.services.length }),
    services: applicationPackage.services,
    intake: applicationPackage.intake ? {
      id: applicationPackage.intake.id,
      updatedAt: applicationPackage.intake.updatedAt.toISOString(),
      sections: formatApplicationSections(applicationPackage.intake.data),
    } : null,
  };
}

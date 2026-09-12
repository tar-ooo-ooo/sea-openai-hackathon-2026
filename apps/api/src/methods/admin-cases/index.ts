import type { AdminCaseDetail, AdminCaseListItem } from "../../types/admin-case.ts";
import { findAdminCaseById, listAdminCases } from "../../services/admin-cases.ts";

function _toListItem(applicationPackage: {
  id: string;
  targetName: string;
  summary: string;
  serviceCount: number;
  createdAt: Date;
  updatedAt: Date;
}): AdminCaseListItem {
  return {
    ...applicationPackage,
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
  };
}

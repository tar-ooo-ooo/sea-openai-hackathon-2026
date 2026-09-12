export type AdminCaseListItem = {
  id: string;
  targetName: string;
  summary: string;
  serviceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCaseService = {
  id: string;
  position: number;
  category: string;
  name: string;
  reason: string;
  status: string;
};

export type AdminCaseDetail = AdminCaseListItem & {
  services: AdminCaseService[];
};

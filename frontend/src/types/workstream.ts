export interface Category {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
  sortOrder: number;
}

export interface StatusUpdate {
  id: string;
  workstreamId: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  categoryId: string | null;
  context: string | null;
  state: 'active' | 'closed';
  createdAt: string;
  closedAt: string | null;
  category?: Category | null;
  latestStatus?: StatusUpdate;
}

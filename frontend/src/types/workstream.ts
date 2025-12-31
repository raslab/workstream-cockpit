export interface Tag {
  id: string;
  name: string;
  color: string;
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
  tagId: string | null;
  context: string | null;
  state: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  tag?: Tag | null;
  latestStatus?: StatusUpdate;
}

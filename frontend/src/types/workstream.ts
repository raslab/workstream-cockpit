export interface Category {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
  sortOrder: number;
}

export interface WorkstreamSummary {
  id: string;
  name?: string;
  workstreamName?: string;
  workstreamId?: string;
  state?: 'active' | 'closed';
  parentId?: string | null;
  depth?: number;
  lastDirectUpdateAt?: string | null;
  lastActivityAt?: string | null;
  lastSubstreamActivityAt?: string | null;
  latestSubstreamActivitySource?: LatestSubstreamActivitySource | null;
}

export interface StatusUpdate {
  id: string;
  workstreamId: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  workstream?: WorkstreamSummary;
  sourceWorkstream?: WorkstreamSummary;
  source?: WorkstreamSummary;
}

export interface LatestSubstreamActivitySource extends WorkstreamSummary {
  updatedAt?: string;
  lastActivityAt?: string;
}

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  workstreamName?: string;
  categoryId: string | null;
  context: string | null;
  state: 'active' | 'closed';
  createdAt: string;
  closedAt: string | null;
  category?: Category | null;
  latestStatus?: StatusUpdate;
  allTags?: string[]; // All tags extracted from context and all status updates

  parentId?: string | null;
  parent?: WorkstreamSummary | null;
  parentStreams?: WorkstreamSummary[];
  substreams?: WorkstreamSummary[];
  substreamCount?: number;
  directSubstreamCount?: number;
  activeSubstreamCount?: number;
  closedSubstreamCount?: number;
  depth?: number;
  lastDirectUpdateAt?: string | null;
  lastSubstreamActivityAt?: string | null;
  lastActivityAt?: string | null;
  latestSubstreamActivitySource?: LatestSubstreamActivitySource | null;
}

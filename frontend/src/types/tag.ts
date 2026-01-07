export interface Tag {
  id: string;
  projectId: string;
  name: string;  // Tag ID with underscores (e.g., "alan_awake")
  displayName: string;  // User-friendly display name (e.g., "Alan Awake")
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  displayName: string;  // User-friendly name with spaces allowed
  color: string;
}

export interface UpdateTagInput {
  displayName?: string;  // User-friendly name with spaces allowed
  color?: string;
}

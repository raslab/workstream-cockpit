export interface WorkstreamRef {
  id?: string;
  number?: number;
  name?: string;
  workstreamName?: string;
  workstreamId?: string;
}

export function workstreamId(ref: WorkstreamRef): string | undefined {
  return ref.id || ref.workstreamId;
}

export function workstreamName(ref: WorkstreamRef | null | undefined): string {
  return ref?.name || ref?.workstreamName || 'Untitled stream';
}

export function workstreamPath(ref: WorkstreamRef): string {
  return `/workstreams/${ref.number ?? workstreamId(ref)}`;
}

export function workstreamReferenceText(ref: WorkstreamRef | null | undefined, options: { name?: boolean } = { name: true }): string {
  if (!ref) return 'Untitled stream';
  const number = ref.number !== undefined ? `#${ref.number}` : undefined;
  const name = workstreamName(ref);
  if (number && options.name !== false) return `${number} ${name}`;
  if (number) return number;
  return name;
}

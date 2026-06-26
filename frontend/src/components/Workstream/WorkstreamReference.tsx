import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { WorkstreamRef } from '../../utils/workstreamReference';
import { workstreamId, workstreamName, workstreamPath, workstreamReferenceText } from '../../utils/workstreamReference';

export { workstreamId, workstreamName, workstreamPath, workstreamReferenceText };

export function WorkstreamNumber({ workstream, className = '' }: { workstream: WorkstreamRef; className?: string }) {
  if (workstream.number === undefined) return null;
  return <span className={className}>#{workstream.number}</span>;
}

export function WorkstreamLink({
  workstream,
  children,
  className = '',
  numberClassName = '',
}: {
  workstream: WorkstreamRef;
  children?: ReactNode;
  className?: string;
  numberClassName?: string;
}) {
  return (
    <span className={className}>
      {workstream.number !== undefined ? (
        <Link to={workstreamPath(workstream)} className={numberClassName || 'font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200'}>#{workstream.number}</Link>
      ) : (
        <Link to={workstreamPath(workstream)}>{children ?? workstreamName(workstream)}</Link>
      )}
      {workstream.number !== undefined && (children ?? <> {workstreamName(workstream)}</>)}
    </span>
  );
}

export function WorkstreamTitle({ workstream, className = '', numberClassName = '' }: { workstream: WorkstreamRef; className?: string; numberClassName?: string }) {
  return (
    <span className={className}>
      {workstream.number !== undefined && <span className={numberClassName}>#{workstream.number}</span>}{workstream.number !== undefined ? ' ' : ''}{workstreamName(workstream)}
    </span>
  );
}

export function WorkstreamNumberTrail({ streams, current }: { streams: WorkstreamRef[]; current?: WorkstreamRef }) {
  const items = current ? [...streams, current] : streams;
  return <>{items.map((item, index) => <span key={`${workstreamId(item) ?? workstreamReferenceText(item)}-${index}`}>{index > 0 && <span className="mx-1 text-gray-400 dark:text-gray-500">›</span>}<WorkstreamNumber workstream={item} /></span>)}</>;
}

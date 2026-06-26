import { Link, useInRouterContext } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { WorkstreamRef } from '../../utils/workstreamReference';
import { workstreamId, workstreamName, workstreamPath, workstreamReferenceText } from '../../utils/workstreamReference';

const defaultReferenceClassName = 'text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200';
const defaultNumberClassName = 'font-semibold underline underline-offset-2';

export { workstreamId, workstreamName, workstreamPath, workstreamReferenceText };

export function WorkstreamNumber({ workstream, className = '' }: { workstream: WorkstreamRef; className?: string }) {
  if (workstream.number === undefined) return null;
  return <span className={className}>#{workstream.number}</span>;
}

export function WorkstreamReferenceContent({
  workstream,
  children,
  numberClassName = defaultNumberClassName,
}: {
  workstream: WorkstreamRef;
  children?: ReactNode;
  numberClassName?: string;
}) {
  const label = children ?? workstreamName(workstream);
  if (workstream.number === undefined) return <>{label}</>;
  return <><span className={numberClassName}>#{workstream.number}</span> {label}</>;
}

export function WorkstreamLink({
  workstream,
  children,
  className = defaultReferenceClassName,
  numberClassName = defaultNumberClassName,
}: {
  workstream: WorkstreamRef;
  children?: ReactNode;
  className?: string;
  numberClassName?: string;
}) {
  const inRouter = useInRouterContext();
  const href = workstreamPath(workstream);
  const content = <WorkstreamReferenceContent workstream={workstream} numberClassName={numberClassName}>{children}</WorkstreamReferenceContent>;
  if (!inRouter) return <a href={href} className={className} title={workstreamName(workstream)}>{content}</a>;

  return (
    <Link to={href} className={className} title={workstreamName(workstream)}>
      {content}
    </Link>
  );
}

export function WorkstreamTitle({ workstream, className = '', numberClassName = '' }: { workstream: WorkstreamRef; className?: string; numberClassName?: string }) {
  return (
    <span className={className}>
      <WorkstreamReferenceContent workstream={workstream} numberClassName={numberClassName} />
    </span>
  );
}

export function WorkstreamNumberTrail({ streams, current }: { streams: WorkstreamRef[]; current?: WorkstreamRef }) {
  const items = current ? [...streams, current] : streams;
  return <>{items.map((item, index) => <span key={`${workstreamId(item) ?? workstreamReferenceText(item)}-${index}`}>{index > 0 && <span className="mx-1 text-gray-400 dark:text-gray-500">›</span>}<WorkstreamNumber workstream={item} /></span>)}</>;
}

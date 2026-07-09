-- Initial status updates are creation context, not operational movement.
-- Backfill only the first update for a stream when it was created in the same
-- transaction/time window as the stream itself; later manually-created updates
-- remain active.
WITH first_updates AS (
  SELECT DISTINCT ON (su.workstream_id)
    su.id,
    su.workstream_id,
    su.created_at
  FROM status_updates su
  ORDER BY su.workstream_id, su.created_at ASC, su.id ASC
)
UPDATE status_updates su
SET impact = 'initial'
FROM first_updates fu
JOIN workstreams ws ON ws.id = fu.workstream_id
WHERE su.id = fu.id
  AND su.impact = 'active'
  AND fu.created_at >= ws.created_at - INTERVAL '5 seconds'
  AND fu.created_at <= ws.created_at + INTERVAL '5 seconds';

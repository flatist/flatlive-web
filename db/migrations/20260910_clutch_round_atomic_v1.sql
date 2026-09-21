BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_clutch_one_live_round
ON clutch_rounds(clutch_id)
WHERE status = 'LIVE';

COMMIT;

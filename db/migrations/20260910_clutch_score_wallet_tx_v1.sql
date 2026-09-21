BEGIN;

ALTER TABLE clutch_score_events
ADD COLUMN IF NOT EXISTS
  wallet_transaction_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_clutch_score_wallet_transaction
ON clutch_score_events(
  wallet_transaction_id
)
WHERE wallet_transaction_id IS NOT NULL;

COMMIT;

-- Invite tokens: store SHA-256 hashes (plaintext token optional for legacy rows)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE invite_tokens
  ALTER COLUMN token DROP NOT NULL;

ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Backfill hashes for existing plaintext tokens (UUID-based legacy invites)
UPDATE invite_tokens
SET token_hash = encode(digest(token::bytea, 'sha256'), 'hex')
WHERE token IS NOT NULL AND token_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token_hash_unique
  ON invite_tokens(token_hash)
  WHERE token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token_unique
  ON invite_tokens(token)
  WHERE token IS NOT NULL;

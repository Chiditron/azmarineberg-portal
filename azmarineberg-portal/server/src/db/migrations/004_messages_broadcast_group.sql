-- Group rows from the same staff bulk send for Sent-folder aggregation (one row per recipient remains for inbox/notifications).
ALTER TABLE messages ADD COLUMN IF NOT EXISTS broadcast_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_messages_sender_broadcast
  ON messages (sender_id, broadcast_group_id)
  WHERE broadcast_group_id IS NOT NULL;

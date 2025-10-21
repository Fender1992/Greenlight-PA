-- Reset tour status for all users
-- Run this in Supabase SQL Editor to make the tour show again

UPDATE member
SET has_seen_tour = false;

-- Or reset just for the most recent user:
-- UPDATE member
-- SET has_seen_tour = false
-- WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);

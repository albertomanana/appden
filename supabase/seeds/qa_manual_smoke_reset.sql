-- ============================================================
-- The Appden - QA manual smoke reset
-- ============================================================
--
-- Deletes only data created by `qa_manual_smoke_seed.sql`.
-- Safe target:
-- - groups named `QA Temp:%`
-- - global friend requests with message `QA Temp:%`

BEGIN;

DELETE FROM friend_requests
WHERE message LIKE 'QA Temp:%';

DELETE FROM groups
WHERE name LIKE 'QA Temp:%';

COMMIT;

SELECT
    COUNT(*) AS remaining_seed_groups
FROM groups
WHERE name LIKE 'QA Temp:%';

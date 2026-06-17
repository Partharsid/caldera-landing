-- ============================================================
-- RR Downtown Arcade — Bulk Slot Generator
-- Generates slots for ALL active services for 365 days
-- Hours: 04:00 – 24:00 (midnight) + the "24-1" slot (00:00-01:00 next day)
-- All times stored in UTC, sourced from IST (Asia/Kolkata, UTC+5:30)
-- ============================================================

-- Preview how many slots will be created (run this first!)
-- SELECT
--   COUNT(*) AS total_slots_to_create,
--   COUNT(DISTINCT service_id) AS services,
--   MIN(start_time AT TIME ZONE 'Asia/Kolkata') AS earliest_slot,
--   MAX(end_time   AT TIME ZONE 'Asia/Kolkata') AS latest_slot
-- FROM (
--   SELECT svc.id AS service_id,
--     (d.slot_date + (h.h * INTERVAL '1 hour')) AT TIME ZONE 'Asia/Kolkata' AS start_time,
--     (d.slot_date + ((h.h + 1) * INTERVAL '1 hour')) AT TIME ZONE 'Asia/Kolkata' AS end_time
--   FROM (
--     SELECT generate_series(
--       date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')::timestamp,
--       date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')::timestamp + INTERVAL '364 days',
--       INTERVAL '1 day'
--     ) AS slot_date
--   ) d
--   CROSS JOIN (SELECT unnest(ARRAY[4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]) AS h) h
--   CROSS JOIN (SELECT id FROM services WHERE is_active = true) svc
-- ) preview;

-- ============================================================
-- MAIN INSERT — Run this to create all slots
-- ============================================================
INSERT INTO slots (id, service_id, start_time, end_time, status, created_at, updated_at)
SELECT
  gen_random_uuid()            AS id,
  svc.id                       AS service_id,
  -- Convert IST → UTC for storage
  (d.slot_date + (h.h * INTERVAL '1 hour')) AT TIME ZONE 'Asia/Kolkata'       AS start_time,
  (d.slot_date + ((h.h + 1) * INTERVAL '1 hour')) AT TIME ZONE 'Asia/Kolkata' AS end_time,
  'available'                  AS status,
  NOW()                        AS created_at,
  NOW()                        AS updated_at

FROM
  -- Date range: today → today + 364 days (365 days total)
  (
    SELECT generate_series(
      date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')::timestamp,
      date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata')::timestamp + INTERVAL '364 days',
      INTERVAL '1 day'
    ) AS slot_date
  ) d

  -- Slot start hours (IST):
  --   4  = 04:00–05:00
  --   5  = 05:00–06:00  ...
  --   23 = 23:00–00:00 (midnight)
  --   24 = 00:00–01:00 NEXT DAY  ← the "24-1" slot
  CROSS JOIN (
    SELECT unnest(ARRAY[
      4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24
    ]) AS h
  ) h

  -- All currently active services
  CROSS JOIN (
    SELECT id FROM services WHERE is_active = true
  ) svc

-- Skip if a slot already exists for this service + start time
-- (safe to re-run without creating duplicates)
WHERE NOT EXISTS (
  SELECT 1 FROM slots ex
  WHERE ex.service_id = svc.id
    AND ex.start_time = (d.slot_date + (h.h * INTERVAL '1 hour')) AT TIME ZONE 'Asia/Kolkata'
);

-- ============================================================
-- Verification query — run after insert to confirm counts
-- ============================================================
-- SELECT
--   sv.name AS service_name,
--   COUNT(*)                                                    AS total_slots,
--   COUNT(*) FILTER (WHERE status = 'available')               AS available,
--   MIN(start_time AT TIME ZONE 'Asia/Kolkata')::date          AS first_day,
--   MAX(start_time AT TIME ZONE 'Asia/Kolkata')::date          AS last_day
-- FROM slots sl
-- JOIN services sv ON sv.id = sl.service_id
-- WHERE sl.created_at >= NOW() - INTERVAL '1 minute'   -- slots just created
-- GROUP BY sv.name
-- ORDER BY sv.name;

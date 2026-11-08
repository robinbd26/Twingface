-- Counter windows are compared with NOW(); store them with a time zone so
-- timestamps round-trip identically regardless of the server/session zone.
ALTER TABLE "rate_limit_counters"
  ALTER COLUMN "reset_at" TYPE TIMESTAMPTZ(3) USING "reset_at" AT TIME ZONE 'UTC';

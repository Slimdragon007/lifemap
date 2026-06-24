-- Important Dates: extend family_events with a category + annual-repeat flag.
-- Additive only — existing rows default cleanly (event_category 'generic',
-- is_annual false), so the demo/local path and prior AI-created events keep
-- working unchanged. No new table, no FK, no encryption (titles aren't sensitive).
ALTER TABLE public.family_events
  ADD COLUMN event_category text NOT NULL DEFAULT 'generic';

ALTER TABLE public.family_events
  ADD COLUMN is_annual boolean NOT NULL DEFAULT false;

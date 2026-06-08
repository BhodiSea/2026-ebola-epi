begin;

-- Change the outbreaks unique constraint from the triple
-- (pathogen_icd11, country_iso3, onset_date) to the pair
-- (pathogen_icd11, country_iso3).
--
-- Rationale: the system tracks ONE active outbreak per (pathogen, country).
-- onset_date records the earliest document date seen for that outbreak.
-- The old triple constraint allowed two concurrent Inngest extractions with
-- different publishedAt dates to both INSERT, splitting case_counts.outbreak_id.
-- The new pair constraint, combined with the atomic
-- INSERT ... ON CONFLICT DO UPDATE LEAST(onset_date) in upsertOutbreak,
-- eliminates that race without any locking primitives.

alter table public.outbreaks
  drop constraint if exists outbreaks_natural_key;

alter table public.outbreaks
  add constraint outbreaks_natural_key unique (pathogen_icd11, country_iso3);

commit;

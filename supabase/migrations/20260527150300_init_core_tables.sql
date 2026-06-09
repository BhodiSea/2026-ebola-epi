begin;

-- ─── public.sources ───────────────────────────────────────────────────────────
create table if not exists public.sources (
  id          uuid          primary key default gen_random_uuid(),
  slug        text          unique not null,
  name        text          not null,
  url         text          not null,
  trust_score numeric(3, 2) not null default 1.00,
  metadata    jsonb         not null default '{}'::jsonb,
  created_at  timestamptz   not null default now()
);
alter table public.sources enable row level security;

-- ─── public.documents ─────────────────────────────────────────────────────────
create table if not exists public.documents (
  id            uuid        primary key default gen_random_uuid(),
  source_id     uuid        not null references public.sources(id),
  sha256        bytea       unique not null,
  url           text        not null,
  full_text     text        not null,
  -- 'simple' config: no stemming — required for FR/EN mixed corpus (MoH DRC, WHO AFRO)
  -- queries must use plainto_tsquery('simple', ...) not the default 'english' parser
  full_text_tsv tsvector    generated always as (to_tsvector('simple', full_text)) stored,
  published_at  timestamptz,
  ingested_at   timestamptz not null default now()
);
alter table public.documents enable row level security;
create index if not exists documents_full_text_tsv_gin_idx
  on public.documents using gin (full_text_tsv);

-- ─── tg_verify_quote_substring ────────────────────────────────────────────────
-- Provenance invariant: quote_text must exactly match the document substring
-- defined by (char_start, char_end). Enforced at the DB level, not application.
create or replace function public.tg_verify_quote_substring()
returns trigger
language plpgsql
as $$
declare
  doc_text text;
begin
  select full_text into strict doc_text
  from public.documents
  where id = new.document_id;
  if substring(doc_text from new.char_start + 1 for new.char_end - new.char_start)
       <> new.quote_text then
    raise exception 'quote_text does not match document substring';
  end if;
  return new;
end;
$$;

-- ─── public.source_quotes ─────────────────────────────────────────────────────
create table if not exists public.source_quotes (
  id          uuid    primary key default gen_random_uuid(),
  document_id uuid    not null references public.documents(id) on delete cascade,
  char_start  integer not null,
  char_end    integer not null,
  quote_text  text    not null,
  embedding   vector(1024),
  created_at  timestamptz not null default now(),
  constraint source_quotes_char_end_gt_start check (char_end > char_start)
);
alter table public.source_quotes enable row level security;
-- HNSW for semantic similarity search; m=16, ef_construction=64 per pgvector defaults
create index if not exists source_quotes_embedding_hnsw_idx
  on public.source_quotes using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
-- GIN trigram for keyword/fuzzy search
create index if not exists source_quotes_quote_text_trgm_idx
  on public.source_quotes using gin (quote_text gin_trgm_ops);

create or replace trigger source_quotes_verify_substring
  before insert or update on public.source_quotes
  for each row execute function public.tg_verify_quote_substring();

-- ─── public.outbreaks ─────────────────────────────────────────────────────────
create table if not exists public.outbreaks (
  id             uuid      primary key default gen_random_uuid(),
  pathogen_icd11 text      not null,
  country_iso3   char(3)   not null,
  onset_date     date      not null,
  name           text,
  status         text      not null default 'active',
  created_at     timestamptz not null default now(),
  constraint outbreaks_natural_key unique (pathogen_icd11, country_iso3, onset_date)
);
alter table public.outbreaks enable row level security;

-- ─── audit.extraction_runs ────────────────────────────────────────────────────
create table if not exists audit.extraction_runs (
  id                          uuid        primary key default gen_random_uuid(),
  document_id                 uuid        not null references public.documents(id),
  source_quote_ids            uuid[]      not null default '{}',
  model_id                    text        not null,
  prompt_version_hash         text        not null,
  tool_schema_hash            text        not null,
  schema_version              text        not null default '1',
  temperature                 numeric(3, 2),
  input_doc_sha256            bytea,
  cache_read_input_tokens     integer     not null default 0,
  cache_creation_input_tokens integer     not null default 0,
  input_tokens                integer     not null default 0,
  output_tokens               integer     not null default 0,
  rows_extracted              integer     not null default 0,
  rows_verified               integer     not null default 0,
  started_at                  timestamptz not null default now(),
  ended_at                    timestamptz,
  created_at                  timestamptz not null default now()
);
-- idempotency: same document+prompt combination only extracted once
create unique index if not exists extraction_runs_doc_prompt_uniq
  on audit.extraction_runs (document_id, prompt_version_hash);
-- append-only audit log: extraction records must never be modified or deleted
revoke update, delete on audit.extraction_runs from authenticated, anon;

-- ─── audit.agent_actions ──────────────────────────────────────────────────────
create table if not exists audit.agent_actions (
  id            bigserial   primary key,
  agent         text        not null,
  action        text        not null,
  subject_table text,
  subject_id    uuid,
  payload       jsonb       not null default '{}'::jsonb,
  trace_id      text,
  ts            timestamptz not null default now()
);
revoke update, delete on audit.agent_actions from authenticated, anon;

-- ─── public.case_counts ───────────────────────────────────────────────────────
-- Declared after audit.extraction_runs to satisfy the FK.
-- Every row MUST have source_quote_id — this is the provenance invariant.
create table if not exists public.case_counts (
  id                  uuid    primary key default gen_random_uuid(),
  outbreak_id         uuid    not null references public.outbreaks(id),
  as_of               date    not null,
  admin1_code         text    references geo.admin1(code),
  metric              text    not null check (metric in (
                        'cases', 'deaths', 'suspected', 'confirmed',
                        'probable', 'vaccinated', 'contacts'
                      )),
  value               integer not null check (value >= 0),
  source_quote_id     uuid    not null references public.source_quotes(id),
  extraction_run_id   uuid    not null references audit.extraction_runs(id),
  model_id            text    not null,
  prompt_version_hash text    not null,
  superseded_by       uuid    references public.case_counts(id),
  status              text    not null default 'pending_review'
                              check (status in ('pending_review', 'published')),
  created_at          timestamptz not null default now()
);
alter table public.case_counts enable row level security;
-- partial index: covers active rows only — used by anon SELECT policy and queries
create index if not exists case_counts_active_idx
  on public.case_counts (outbreak_id, metric, as_of desc)
  where superseded_by is null;

commit;

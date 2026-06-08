begin;
select plan(10);

-- ── New columns exist with correct types ──────────────────────────────────────

select has_column(
  'public', 'case_counts', 'admin_name',
  'case_counts has admin_name column (WS1)'
);

select col_type_is(
  'public', 'case_counts', 'admin_name', 'text',
  'admin_name is text'
);

select col_is_null(
  'public', 'case_counts', 'admin_name',
  'admin_name is nullable'
);

select has_column(
  'public', 'case_counts', 'is_new_in_period',
  'case_counts has is_new_in_period column (WS1)'
);

select col_type_is(
  'public', 'case_counts', 'is_new_in_period', 'boolean',
  'is_new_in_period is boolean'
);

select col_is_null(
  'public', 'case_counts', 'is_new_in_period',
  'is_new_in_period is nullable'
);

-- ── Metric constraint: all 12 valid values succeed ────────────────────────────
-- Inserts all 12 metrics + one Rwampara/is_new_in_period row for column round-trip.

do $$
declare
  v_outbreak_id  uuid;
  v_sq_id        uuid;
  v_er_id        uuid;
  v_doc_id       uuid;
  v_source_id    uuid;
  v_metric       text;
  v_metrics      text[] := array[
    'cases', 'deaths', 'suspected', 'confirmed',
    'probable', 'vaccinated', 'contacts',
    'healthcare_workers', 'hcw_deaths', 'nosocomial',
    'lab_positive', 'in_treatment'
  ];
begin
  select id into v_source_id from public.sources limit 1;
  if v_source_id is null then
    raise exception 'no source rows — run seed first';
  end if;

  insert into public.documents (source_id, url, sha256, full_text, published_at)
    values (v_source_id, 'https://example.com/pgtap-ws1', '\xdeadbeef'::bytea,
            'test document text', now())
    returning id into v_doc_id;

  v_er_id := gen_random_uuid();
  insert into audit.extraction_runs
    (id, document_id, model_id, prompt_version_hash, tool_schema_hash,
     input_doc_sha256, cache_read_input_tokens, cache_creation_input_tokens,
     input_tokens, output_tokens, rows_extracted, rows_verified, source_quote_ids)
  values
    (v_er_id, v_doc_id, 'claude-test', 'testhash', 'toolhash',
     '\xdeadbeef'::bytea, 0, 0, 10, 5, 12, 12, array[]::uuid[]);

  insert into public.outbreaks (pathogen_icd11, country_iso3, onset_date)
    values ('1D60.2', 'COD', '2026-01-01')
    on conflict (pathogen_icd11, country_iso3) do nothing;
  select id into v_outbreak_id from public.outbreaks
    where pathogen_icd11 = '1D60.2' and country_iso3 = 'COD' limit 1;

  foreach v_metric in array v_metrics loop
    insert into public.source_quotes (document_id, char_start, char_end, quote_text)
      values (v_doc_id, 5, 13, 'document')
      on conflict (document_id, char_start, char_end) do update set quote_text = excluded.quote_text
      returning id into v_sq_id;

    insert into public.case_counts
      (outbreak_id, as_of, metric, value, source_quote_id, extraction_run_id,
       model_id, prompt_version_hash, status)
    values
      (v_outbreak_id, '2026-05-15', v_metric, 1, v_sq_id, v_er_id,
       'claude-test', 'testhash', 'published');
  end loop;

  -- admin_name + is_new_in_period round-trip row
  insert into public.source_quotes (document_id, char_start, char_end, quote_text)
    values (v_doc_id, 5, 13, 'document')
    on conflict (document_id, char_start, char_end) do update set quote_text = excluded.quote_text
    returning id into v_sq_id;

  insert into public.case_counts
    (outbreak_id, as_of, metric, value, admin_name, is_new_in_period,
     source_quote_id, extraction_run_id, model_id, prompt_version_hash, status)
  values
    (v_outbreak_id, '2026-05-15', 'confirmed', 28, 'Rwampara', true,
     v_sq_id, v_er_id, 'claude-test', 'testhash', 'published');
end;
$$;

select pass('all 12 valid metrics inserted without constraint violation');

-- ── Invalid metric is rejected ────────────────────────────────────────────────

select throws_ok(
  $$insert into public.case_counts
      (outbreak_id, as_of, metric, value, source_quote_id, extraction_run_id,
       model_id, prompt_version_hash, status)
    select o.id, '2026-05-15'::date, 'made_up', 1, sq.id, er.id,
           'claude-test', 'testhash', 'published'
    from public.outbreaks o, public.source_quotes sq,
         audit.extraction_runs er
    limit 1$$,
  '23514',
  null,
  'metric=made_up violates check constraint'
);

select pass('healthcare_workers is in the metric constraint (verified by loop above)');

-- ── admin_name and is_new_in_period round-trip ────────────────────────────────

select results_eq(
  $$select admin_name, is_new_in_period
      from public.case_counts
      where admin_name = 'Rwampara'
      limit 1$$,
  $$values ('Rwampara'::text, true)$$,
  'admin_name and is_new_in_period store and retrieve correctly'
);

select * from finish();
rollback;

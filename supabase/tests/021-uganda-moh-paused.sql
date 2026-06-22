begin;

select plan(2);

select ok(
  (select extraction_paused from public.sources where slug = 'uganda-moh'),
  'uganda-moh adapter is paused (health.go.ug unreachable as of 2026-06-22)'
);

select is(
  (select extraction_paused from public.sources where slug = 'uganda-moh'),
  true,
  'extraction_paused is exactly true for uganda-moh'
);

select * from finish();

rollback;

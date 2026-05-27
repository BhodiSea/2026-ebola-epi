# pgvector + PostGIS conventions

## pgvector

### HNSW, not IVFFlat (default in 2026)

pgvector's own README: *"an HNSW index creates a multilayer graph. It has
better query performance than IVFFlat (in terms of speed-recall tradeoff)."*

In production:

- HNSW absorbs inserts without quality loss; IVFFlat needs periodic full
  rebuilds as the data distribution shifts.
- HNSW is in-memory; size your Supabase tier so `rows × dimensions × 4 bytes`
  fits. Disk-backed HNSW (pgvector 0.8+) works but is slower.

### Index DSL

Raw SQL:

```sql
create index if not exists source_quote_embeddings_cosine_idx
  on public.source_quote_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
```

Drizzle:

```ts
cosineIdx: index('source_quote_embeddings_cosine_idx')
  .using('hnsw', t.embedding.op('vector_cosine_ops'))
```

### Operators by embedding model

| Model                                | Operator class      | Distance fn          |
| ------------------------------------ | ------------------- | -------------------- |
| OpenAI `text-embedding-3-small/large`| `vector_cosine_ops` | `cosineDistance`     |
| Voyage `voyage-3`                    | `vector_cosine_ops` | `cosineDistance`     |
| Cohere `embed-english-v3.0`          | `vector_cosine_ops` | `cosineDistance`     |
| Anthropic (when shipped)             | confirm per model   | confirm per model    |

Confirm operator choice per model — using cosine on un-normalised vectors
silently degrades recall.

### Dimensions

- Max 2000 dims for HNSW.
- `text-embedding-3-small` (1536) — comfortable fit.
- `text-embedding-3-large` (3072) — does NOT fit; truncate to 1536 or use IVFFlat.

### Hybrid search (BM25 + vector)

Combine `tsvector` full-text rank with HNSW similarity via Reciprocal
Rank Fusion (RRF) in a SQL function. No Python service needed:

```sql
create or replace function public.hybrid_search(
  q_embedding vector(1536),
  q_text      text,
  match_count int default 10
) returns table (id uuid, score float)
language sql stable as $$
  with semantic as (
    select id, row_number() over (order by embedding <=> q_embedding) as rank
    from public.source_quote_embeddings
    order by embedding <=> q_embedding
    limit match_count * 2
  ),
  lexical as (
    select sq.id, row_number() over (order by ts_rank(sq.tsv, websearch_to_tsquery(q_text)) desc) as rank
    from public.source_quotes sq
    where sq.tsv @@ websearch_to_tsquery(q_text)
    limit match_count * 2
  )
  select coalesce(s.id, l.id) as id,
         coalesce(1.0 / (60 + s.rank), 0) + coalesce(1.0 / (60 + l.rank), 0) as score
  from semantic s
  full outer join lexical l on s.id = l.id
  order by score desc
  limit match_count;
$$;
```

### Query-time recall tuning

`ef_search` (default 40) trades recall for latency. Raise per-query for
higher recall:

```sql
set local hnsw.ef_search = 100;
```

## PostGIS

### SRID 4326. Always.

Geometry, not geography — unless you're computing distances on a global
scale (DRC/Uganda fits in a UTM zone, so no).

```sql
create table public.health_zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  centroid geometry(point, 4326) not null,
  polygon  geometry(multipolygon, 4326) not null
);

create index health_zones_polygon_gist on public.health_zones using gist (polygon);
```

### Vector tiles via `ST_AsMVT`

Don't run a separate tile server (pg_tileserv, Martin, Tegola) when a
Postgres function returning `bytea` does the job:

```sql
create or replace function public.mvt_health_zones(z int, x int, y int)
returns bytea
language sql stable as $$
  with t as (
    select id, code, name,
           st_asmvtgeom(
             st_transform(polygon, 3857),
             st_tileenvelope(z, x, y),
             4096, 256, true
           ) as geom
    from public.health_zones
    where st_intersects(polygon, st_transform(st_tileenvelope(z, x, y), 4326))
  )
  select st_asmvt(t.*, 'health_zones') from t;
$$;
```

Exposed via a Next.js Route Handler:

```ts
// app/api/mvt/health-zones/[z]/[x]/[y]/route.ts
export async function GET(_req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('mvt_health_zones', {
    z: Number(z), x: Number(x), y: Number(y),
  });
  if (error) return new Response(error.message, { status: 500 });
  return new Response(data, {
    headers: {
      'Content-Type': 'application/x-protobuf',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
    },
  });
}
```

Benefits over pg_tileserv: unified auth (RLS applies), one less service to
deploy, multi-layer composition via `string_agg(ST_AsMVT(…) || …)`.

### Simplification by zoom

Materialised views for simplified polygons by zoom band, refreshed nightly:

```sql
create materialized view public.health_zones_z6 as
  select id, code, name, st_simplify(polygon, 0.05) as polygon
  from public.health_zones;

create unique index on public.health_zones_z6 (id);
create index health_zones_z6_polygon_gist on public.health_zones_z6 using gist (polygon);

refresh materialized view concurrently public.health_zones_z6;
```

Plumb the MVT function to pick the right MV by zoom:

```sql
case
  when z <= 6  then 'public.health_zones_z6'::regclass
  when z <= 10 then 'public.health_zones_z10'::regclass
  else 'public.health_zones'::regclass
end
```

### Forbidden

- `geography` for sub-continent-scale data. Slower, fewer operators.
- Mixing SRIDs. Always 4326 at the boundary; transform to 3857 only
  inside MVT functions.
- pg_tileserv / Martin / Tegola as a second service when `ST_AsMVT` RPC
  does the same job through PostgREST + RLS.
- Re-projecting in JS in the browser — do it in the database.

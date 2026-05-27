# Phase 5 — Map command center

## Goal

Build the PostGIS MVT tile pipeline (`internal.mvt` SECURITY DEFINER function + Route Handler) and the three-pane `/map` command center: NavRail (60 px) | LayerRail (280 px) | MapPane (MapLibre + deck.gl, flex) | InspectorTabs (380 px). Wire the `<TimeScrubber>` (120 px, multi-track via Visx + `@visx/brush`, four tracks). Add keyboard parity, tabular view (`?view=table`), and the `geo.admin1`/`geo.admin2` geometry data via seed migration. Conclude with a backup/restore drill on Supabase to confirm the `case_counts.superseded_by` history survives a branch restore.

---

## Entry preconditions

- Phase 4 exit gate met: `/today` + all editorial surfaces live; journalist test passes in < 10 s.
- `geo.admin1` and `geo.admin2` tables exist (Phase 1 schema); the materialized views `geo.zone_geom_z6` and `geo.zone_geom_z10` exist (Phase 1).
- `geo.admin1`/`geo.admin2` geometry data loaded for the active outbreak region (see Deliverables → seed migration below).
- Supabase Branching wired (Phase 0); the project has a production branch to run the backup/restore drill against.

---

## Deliverables

### Schema / migrations

**`supabase/migrations/<timestamp>_mvt_functions.sql`** — the PostGIS tile pipeline:

```sql
begin;
-- SECURITY DEFINER in the non-exposed internal schema
create or replace function internal.mvt(
  z integer, x integer, y integer, p_outbreak uuid default null
) returns bytea language plpgsql stable parallel safe security definer
set search_path = '' as $$
declare result bytea;
begin
  with bounds as (select st_tileenvelope(z, x, y) as g),
  zones as (
    select st_asmvt(t, 'zones', 4096, 'geom') as mvt
    from (
      select st_asmvtgeom(
               st_transform(zg.geom, 3857),
               (select g from bounds), 4096, 64, true
             ) as geom,
             zg.code, zg.name
      from (
        select code, name, geom from geo.zone_geom_z6  where z < 8
        union all
        select code, name, geom from geo.zone_geom_z10 where z >= 8
      ) zg
      where zg.geom && st_transform((select g from bounds), 4326)
    ) t where t.geom is not null
  ),
  cases as (
    select st_asmvt(t, 'cases', 4096, 'geom') as mvt
    from (
      select st_asmvtgeom(
               st_transform(st_centroid(a.geom), 3857),
               (select g from bounds), 4096, 16, true
             ) as geom,
             cc.outbreak_id, cc.metric, cc.value, cc.as_of,
             cc.source_quote_id
      from public.case_counts cc
      join geo.admin1 a on a.code = cc.admin1_code
      where cc.superseded_by is null
        and (p_outbreak is null or cc.outbreak_id = p_outbreak)
        and a.geom && st_transform((select g from bounds), 4326)
    ) t where t.geom is not null
  )
  select coalesce((select mvt from zones), ''::bytea)
      || coalesce((select mvt from cases), ''::bytea)
  into result;
  return result;
end; $$;

revoke all on function internal.mvt(integer,integer,integer,uuid) from public;
grant execute on function internal.mvt(integer,integer,integer,uuid) to anon, authenticated;

-- PostgREST-visible SECURITY INVOKER wrapper
create or replace function public.mvt(
  z integer, x integer, y integer, outbreak_id uuid default null
) returns bytea language sql stable parallel safe security invoker as $$
  select internal.mvt(z, x, y, outbreak_id);
$$;
commit;
```

**`supabase/migrations/<timestamp>_geo_seed_ituri.sql`** — load Ituri Province geometry:

Seed DRC admin1/admin2 GeoJSON using `ST_GeomFromGeoJSON`. In production this is a one-off migration; for CI it runs via `supabase db reset`. At minimum, seed one polygon for "Ituri Province" so the tile pipeline returns a non-empty response.

Refresh materialized views after loading:
```sql
refresh materialized view geo.zone_geom_z6;
refresh materialized view geo.zone_geom_z10;
```

**Important**: `geo.zone_geom_z6` and `geo.zone_geom_z10` (created in Phase 1) are built from `geo.admin1`, not `geo.admin2`. This is required because `case_counts.admin1_code` references `geo.admin1`. The choropleth join in the MVT function:
```sql
join geo.admin1 a on a.code = cc.admin1_code
```
must use the same granularity as the zones layer. If you need admin2-level display polygons for other purposes, create separate materialized views `geo.admin2_z8` and `geo.admin2_z12` — do not mix them with the choropleth zones.

### Code — MVT Route Handler

**`apps/web/app/api/mvt/[z]/[x]/[y]/route.ts`**:

```ts
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  ctx: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await ctx.params;
  const outbreakId = new URL(_.url).searchParams.get("outbreak_id") ?? undefined;
  const sb = await createClient();
  const { data, error } = await sb.rpc("mvt", {
    z: Number(z), x: Number(x), y: Number(y),
    ...(outbreakId ? { outbreak_id: outbreakId } : {}),
  });
  if (error) return new Response(error.message, { status: 500 });
  return new Response(data as ArrayBuffer, {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
```

Cache invalidation: in the publish step (Phase 6), call `revalidateTag("map:tiles")`.

### Code — `/map` three-pane layout

**`apps/web/app/map/page.tsx`** (Server Component — renders the shell; individual panes are Client Components):

Layout (≥ 1280 px):
```
[NavRail 60] | [LayerRail 280] | [MapPane flex] | [InspectorTabs 380]
```

The TimeScrubber (120 px) is pinned below the MapPane canvas inside the MapPane region.

**`apps/web/app/map/layout.tsx`** — forces `overflow: hidden` on the body for this route to prevent scroll conflicts with the map.

### Code — `<LayerRail>`

**`apps/web/components/map/layer-rail.tsx`** (Client Component):
- Six layer groups with shadcn Checkbox per layer: Base (admin0/1/2 borders) · Epi data (confirmed/deaths/attack-rate choropleth) · Operational (ETU, vaccination sites, ACLED) · Context (population density, health facilities, travel time) · Annotations · Saved views.
- `[` / `]` keyboard shortcut cycles focused layer.
- Outbreak selector dropdown at the bottom.

### Code — `<MapPane>`

**`apps/web/components/map/map-pane.tsx`** (Client Component — `'use client'` required for MapLibre + deck.gl):

```ts
import maplibregl from "maplibre-gl";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
```

- Base style: Carto Positron (light) / Carto Dark Matter (dark). Switched by `data-theme` attribute.
- Vector tile source pointing to `/api/mvt/{z}/{x}/{y}?outbreak_id={id}`.
- Admin1 choropleth in ColorBrewer Reds 5-class sequential.
- deck.gl `MapboxOverlay` in `interleaved: true` so overlays respect map-label z-order.
- "No data" zones: hatched diagonal SVG pattern fill (not gray).
- `?view=table` URL parameter swaps the MapPane for the tabular view (required, not optional).

Keyboard parity:
- Arrow keys pan.
- `+` / `-` zoom.
- `[` / `]` cycle features.
- `L` cycle layers.
- `T` cycle time window (7d / 30d / 90d / all).

Focus ring on the selected feature at 7:1 contrast.

Map camera animation: 400 ms `cubic-bezier(0.32, 0.72, 0, 1)`. `prefers-reduced-motion: reduce` → instant.

### Code — `<InspectorTabs>`

**`apps/web/components/map/inspector-tabs.tsx`** (Client Component):
- Tabs: Overview · Timeline · Sources · Raw (keyboard `1 2 3 4`).
- Empty state: "Click a region to inspect."
- Overview tab: admin1 name header, `<SeverityPill>`, StatCard rows (each value wrapped in `<Figure>`), "First detected" date, multi-source agreement indicator.
- Timeline tab: `<TimelineMulti>` scoped to the selected admin1.
- Sources tab: documents contributing case_counts to this region.
- Raw tab: raw `case_counts` JSON for this region.

### Code — `<TimeScrubber>`

**`apps/web/components/map/time-scrubber.tsx`** (Client Component):
- 120 px height, pinned below canvas.
- Four tracks (top to bottom): confirmed cases (filled area, Reds-300) · deaths (filled area, dark slate) · sitrep publications (rule marks) · ACLED events (amber rule marks, toggle).
- Implemented with Visx `XYChart` + `@visx/brush`.
- Drag updates map state; updates debounced to 50 ms before committing.
- ARIA-live `polite` announces: "Showing week 22 of 2026, N confirmed cases."
- Playback controls: ◀◀ ◀ ⏸ ▶ ▶▶.

---

## Tests

### Vitest

**`apps/web/app/api/mvt/__tests__/route.test.ts`** — mocks the Supabase RPC call, asserts:
- Returns `application/x-protobuf` content-type.
- Returns `Cache-Control: public, max-age=86400, s-maxage=604800, immutable`.
- Returns 500 with error message on Supabase RPC failure.

**`apps/web/components/map/__tests__/time-scrubber.test.tsx`** — mocks Visx brush, asserts ARIA-live region is present and announce format is correct.

### pgTAP

**`supabase/tests/006-mvt-function.sql`**:
```sql
-- internal.mvt returns bytea
select ok(
  pg_catalog.pg_typeof(internal.mvt(6, 32, 32)) = 'bytea'::regtype,
  'internal.mvt returns bytea'
);
-- public cannot call internal.mvt directly (only via wrapper)
select tests.authenticate_as('anon');
select throws_ok(
  $$ select internal.mvt(6, 32, 32) $$
);
select tests.clear_authentication();
```

### Playwright

**`apps/web/e2e/map.spec.ts`**:
```ts
test("/map renders three-pane layout", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator("[data-layer-rail]")).toBeVisible();
  await expect(page.locator("[data-map-pane]")).toBeVisible();
  await expect(page.locator("[data-inspector-tabs]")).toBeVisible();
});

test("?view=table shows tabular view instead of map", async ({ page }) => {
  await page.goto("/map?view=table");
  await expect(page.locator("[data-tabular-view]")).toBeVisible();
  await expect(page.locator("[data-map-pane]")).not.toBeVisible();
});

test("keyboard L cycles layers", async ({ page }) => {
  await page.goto("/map");
  await page.locator("[data-map-pane]").focus();
  await page.keyboard.press("L");
  await expect(page.locator("[data-layer-rail]")).toContainText("Deaths");
});
```

### Backup/restore drill (exit gate requirement)

This drill is performed manually against the live Supabase project:

```bash
# 1. Take a snapshot
supabase db snapshot create --name phase-5-baseline

# 2. Create a restore branch
supabase branches create --name restore-test

# 3. Restore to the new branch
supabase db snapshot restore --branch restore-test --snapshot phase-5-baseline

# 4. Verify superseded_by history survives
supabase db execute --branch restore-test \
  "SELECT count(*) FROM public.case_counts WHERE superseded_by IS NOT NULL"
# Expected: count matches production branch

# 5. Clean up
supabase branches delete restore-test
```

---

## Tooling

- `maplibre-gl` ≥ 5 — vector tile map.
- `deck.gl` ≥ 9 — WebGL overlays (`@deck.gl/mapbox`, `@deck.gl/layers`).
- `@visx/xychart`, `@visx/brush` — TimeScrubber.
- `@types/maplibre-gl` — type definitions.

---

## Verification

```bash
# 1. pgTAP
supabase test db
# Expected: test 006 passes; all prior tests still pass.

# 2. MVT tile returns bytes
curl "http://localhost:3000/api/mvt/6/32/32" -I
# Expected: Content-Type: application/x-protobuf; Cache-Control: ...immutable

# 3. /map renders
pnpm dev
# Navigate to /map
# Expected: LayerRail, MapPane (with Ituri choropleth), InspectorTabs visible.
# Click Ituri Province polygon.
# Expected: InspectorTabs populates with Overview tab showing StatCards.

# 4. Tabular view
# Navigate to /map?view=table
# Expected: data table renders with case_counts; no map canvas.

# 5. Keyboard parity
# Focus the map canvas, press L.
# Expected: layer focus cycles in LayerRail.
# Press T.
# Expected: time window cycles (7d → 30d → 90d → all).

# 6. TimeScrubber
# Drag the scrubber thumb to a past date.
# Expected: choropleth updates within 50ms debounce; ARIA-live announces the date.

# 7. Backup/restore drill (see above)
```

---

## Exit gate

The three-pane `/map` is live with a real outbreak choropleth, the `<TimeScrubber>` scrubs the data in real time, `?view=table` renders the tabular alternative, and a Supabase backup/restore drill confirms that `case_counts.superseded_by` history survives the restore cycle.

---

## Research cross-references

- [backend.md §6 — Vector-tile serving via ST_AsMVT](../../research/backend.md#6-vector-tile-serving-via-stasmmvt)
- [ux.md §4 — Hybrid command center](../../research/ux.md#4-the-hybrid-command-center--primary-surface)
- [ux.md §7 — Charts, maps, data vis discipline](../../research/ux.md#7-charts-maps-data-vis-discipline)
- [ui.md §2.0 — /map desktop wireframe](../../research/ui.md#20-map--the-command-center-desktop-1280px)
- [ui.md §2.1 — Inspector open](../../research/ui.md#21-map-with-inspector-open-on-bunia-admin1)
- [ui.md §2.2 — TimeScrubber](../../research/ui.md#22-map-with-timescrubber-engaged)
- [ux.md §11 — Keyboard-native operation](../../research/ux.md#11-keyboard-native-operation)
- [ux.md §13 — Accessibility](../../research/ux.md#13-accessibility-wcag-22-aa-target-aaa-on-critical-numbers)

---

## Out of scope

- Multi-source adapters beyond WHO DON (Phase 6).
- Reconciliation Agent or `+1 disagreement` UI (Phase 6).
- ACLED event layer data (Phase 6 — the layer toggle exists but data loads in Phase 6).
- Langfuse self-hosted (Phase 7).
- Cost kill switch (Phase 7).
- The vaul mobile bottom-sheet inspector (Phase 8).
- Internal admin routes (Phase 8).
- OG cards (Phase 8).

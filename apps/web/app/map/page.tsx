import { notFound } from "next/navigation";

import { MapClientShell } from "@/components/map/map-client-shell";
import { TabularView } from "@/components/map/tabular-view";
import { LastUpdatedIndicator } from "@/components/provenance/last-updated-indicator";
import { getEpiCurveSeries } from "@/lib/queries/case-counts";
import { getOutbreakZoneSvg } from "@/lib/queries/choropleth";
import { getDocumentsForOutbreak, getLastIngestedAt } from "@/lib/queries/documents";
import { getActiveOutbreak, getOutbreakById, listOutbreaks } from "@/lib/queries/outbreaks";

interface MapPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MapPage({ searchParams }: Readonly<MapPageProps>) {
  const params = await searchParams;
  const requestedId = typeof params.outbreak === "string" ? params.outbreak : null;
  const outbreak =
    requestedId === null ? await getActiveOutbreak() : await getOutbreakById(requestedId);

  if (outbreak === null) {
    notFound();
  }

  if (params.view === "table") {
    return <TabularView outbreakId={outbreak.id} />;
  }

  const [{ confirmed, deaths }, zoneData, outbreaksList, documents, lastIngestedAt] =
    await Promise.all([
      getEpiCurveSeries(outbreak.id),
      getOutbreakZoneSvg(outbreak.id),
      listOutbreaks({ status: "active" }),
      getDocumentsForOutbreak(outbreak.id),
      getLastIngestedAt(outbreak.id),
    ]);

  const caseCountsByCode: Record<string, number> = Object.fromEntries(
    (zoneData?.zones ?? []).map((z) => [z.admin2Code, z.totalValue]),
  );

  const sitrepDates = [
    ...new Set(
      documents
        .map((d) => d.publishedAt)
        .filter((d): d is string => d !== null)
        .map((d) => d.slice(0, 10)),
    ),
  ];

  const outbreaks = outbreaksList.map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="relative flex flex-col">
      {lastIngestedAt === null ? null : (
        <div className="flex justify-end px-4 py-1">
          <LastUpdatedIndicator updatedAt={lastIngestedAt} />
        </div>
      )}
      <MapClientShell
        outbreakId={outbreak.id}
        confirmedSeries={confirmed}
        deathsSeries={deaths}
        sitrepDates={sitrepDates}
        caseCountsByCode={caseCountsByCode}
        outbreaks={outbreaks}
      />
    </div>
  );
}

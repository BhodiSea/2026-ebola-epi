interface AltTextOptions {
  asOf: string;
  elementType: "map" | "timeline";
  highlight?: string;
  scope: string;
  variable: string;
}

export function buildChartAltText({
  elementType,
  scope,
  variable,
  asOf,
  highlight,
}: AltTextOptions): string {
  const tail = highlight === undefined ? "" : ` ${highlight}`;
  if (elementType === "map") {
    return `Choropleth map of ${scope}, coloured by ${variable} as of ${asOf}.${tail}`;
  }
  return `Line chart of ${variable} by week as of ${asOf} for ${scope}.${tail}`;
}

import { describe, expect, it } from "vitest";

import { JsonLd } from "../json-ld";

describe("JsonLd", () => {
  it("renders a script tag with type application/ld+json", () => {
    const payload = { "@context": "https://schema.org", "@type": "WebSite", name: "test" };
    const result = JsonLd({ schema: payload });
    expect(result.type).toBe("script");
    expect(result.props.type).toBe("application/ld+json");
  });

  it("serialises the schema payload to JSON", () => {
    const payload = { "@context": "https://schema.org", "@type": "Dataset", name: "ituri" };
    const result = JsonLd({ schema: payload });
    const innerHtml = (result.props.dangerouslySetInnerHTML as { __html: string }).__html;
    const parsed = JSON.parse(innerHtml) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("Dataset");
  });
});

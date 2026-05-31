import { describe, expect, it } from "vitest";

import { JsonLd } from "../json-ld";

describe("JsonLd", () => {
  it("renders a script tag with type application/ld+json", () => {
    const payload = { "@context": "https://schema.org", "@type": "WebSite", name: "test" };
    const result = JsonLd({ schema: payload });
    expect(result.type).toBe("script");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- JSX element props typed as any; direct prop inspection in component unit test
    expect(result.props.type).toBe("application/ld+json");
  });

  it("serialises the schema payload to JSON", () => {
    const payload = { "@context": "https://schema.org", "@type": "Dataset", name: "ituri" };
    const result = JsonLd({ schema: payload });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-type-assertion -- JSX element props typed as any; cast to inspect dangerouslySetInnerHTML shape
    const innerHtml = (result.props.dangerouslySetInnerHTML as { __html: string }).__html;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; cast to narrow for test assertions
    const parsed = JSON.parse(innerHtml) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("Dataset");
  });
});

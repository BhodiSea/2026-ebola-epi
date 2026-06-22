import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LISTING_HTML = readFileSync(
  path.resolve(import.meta.dirname, "./fixtures/moh-drc.html"),
  "utf8",
);

// A minimal bulletin article for parse() tests — enough text for Readability.
const BULLETIN_HTML = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport de situation Ebola – Ituri | MSP RDC</title></head>
<body>
<article class="article-content">
  <h1>Rapport de situation numéro 42 : Maladie à virus Ebola Bundibugyo – Ituri</h1>
  <time datetime="2026-05-20">20 mai 2026</time>
  <div class="content">
    <p>Au 20 mai 2026, la République Démocratique du Congo enregistre 47 cas confirmés et 12 décès
    (taux de létalité de 25,5 %) depuis le début de la flambée le 20 avril 2026 dans la province de l'Ituri,
    zone de santé de Bunia.</p>
    <p>Les équipes de riposte rapide du Ministère de la Santé Publique sont déployées sur le terrain
    en collaboration avec les partenaires dont l'OMS et MSF. Le suivi des contacts est en cours,
    avec 312 contacts actuellement sous surveillance.</p>
    <p>Le prochain rapport de situation sera publié le 27 mai 2026.</p>
  </div>
</article>
</body>
</html>`;

const ALLOW_ALL_ROBOTS = "User-agent: *\nAllow: /\n";
const CRON_RE = /^[\d*,/\s-]+$/;

function makeHtmlFetchMock(listingHtml: string, articleHtml = BULLETIN_HTML) {
  return async (url: string) => {
    await Promise.resolve();
    const u = new URL(url);
    if (u.pathname === "/robots.txt") {
      return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
    }
    if (u.pathname === "/epidemie") {
      return new Response(listingHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response(articleHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
}

describe("mohDRCAdapter metadata", () => {
  it("has correct sourceSlug", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    expect(mohDRCAdapter.sourceSlug).toBe("moh-drc");
  });

  it("has correct throttleKey", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    expect(mohDRCAdapter.throttleKey).toBe("sante.gouv.cd");
  });

  it("has valid cron pollInterval", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    expect(mohDRCAdapter.pollInterval).toMatch(CRON_RE);
  });
});

describe("mohDRCAdapter.poll()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeHtmlFetchMock(LISTING_HTML));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns items with /epidemie/ URLs", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const items = await mohDRCAdapter.poll();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.url).toContain("/epidemie/");
    }
  });

  it("does not include non-epidemie links", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const items = await mohDRCAdapter.poll();
    const hasNonEpidemie = items.some((i) => i.url.includes("/actualites/"));
    expect(hasNonEpidemie).toBe(false);
  });

  it("throws moh_drc_selector_empty when listing page yields no /epidemie/ links", async () => {
    vi.stubGlobal(
      "fetch",
      makeHtmlFetchMock(
        `<!DOCTYPE html><html><body><a href="/actualites/foo">Actualité</a></body></html>`,
      ),
    );
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    await expect(mohDRCAdapter.poll()).rejects.toThrow("moh_drc_selector_empty");
  });

  it("deduplicates when the same URL appears multiple times in the listing", async () => {
    const dupHtml = `<!DOCTYPE html><html><body>
      <ul>
        <li><a href="/epidemie/ebola-ituri-2026">Rapport 42</a></li>
        <li><a href="/epidemie/ebola-ituri-2026">Rapport 42 (duplicate)</a></li>
        <li><a href="/epidemie/ebola-ituri-2025">Rapport 01</a></li>
      </ul>
    </body></html>`;
    vi.stubGlobal("fetch", makeHtmlFetchMock(dupHtml));
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const items = await mohDRCAdapter.poll();
    const urls = items.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(2);
  });
});

describe("mohDRCAdapter.fetch()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeHtmlFetchMock(LISTING_HTML));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns skipped:false with sha256 Buffer on 200", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const result = await mohDRCAdapter.fetch("https://sante.gouv.cd/epidemie/ebola-ituri-2026");
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
  });

  it("returns skipped:true on 304", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      await Promise.resolve();
      const u = new URL(url);
      if (u.pathname === "/robots.txt") {
        return new Response(ALLOW_ALL_ROBOTS, { status: 200 });
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- partial mock; 304 Response can't be constructed via `new Response(body, {status:304})` per Fetch spec
      return {
        status: 304,
        ok: false,
        headers: { get: () => null },
        text: async () => "",
      } as unknown as Response;
    });
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const result = await mohDRCAdapter.fetch("https://sante.gouv.cd/epidemie/ebola-ituri-2026");
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("304 Not Modified");
  });
});

describe("mohDRCAdapter.parse()", () => {
  it("returns fullText with French content and language:fr", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const result = await mohDRCAdapter.parse({ rawContent: BULLETIN_HTML, mimeType: "text/html" });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("République Démocratique");
    expect(result.language).toBe("fr");
  });

  it("hard-codes language:fr regardless of html lang attribute", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const enHtml = BULLETIN_HTML.replace('lang="fr"', 'lang="en"');
    const result = await mohDRCAdapter.parse({ rawContent: enHtml, mimeType: "text/html" });
    if (result.skipped) {
      return;
    }
    expect(result.language).toBe("fr");
  });

  it("returns skipped:true with readability_parse_failed for minimal HTML", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const result = await mohDRCAdapter.parse({
      rawContent: "<!DOCTYPE html><html><head></head><body></body></html>",
      mimeType: "text/html",
    });
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("readability_parse_failed");
  });

  // ingest-runner always passes rawBytes from fetchResult to parse; mimeType must
  // guard the parsePdf branch so HTML articles are not misidentified as PDFs.
  it("parse produces fullText when rawBytes is set alongside mimeType:text/html", async () => {
    const { mohDRCAdapter } = await import("../sources/moh-drc.js");
    const rawBytes = new TextEncoder().encode(BULLETIN_HTML);
    const result = await mohDRCAdapter.parse({
      rawContent: BULLETIN_HTML,
      mimeType: "text/html",
      rawBytes,
    });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("République Démocratique");
  });
});

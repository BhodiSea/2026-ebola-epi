# ituri-sitrep: Copy Strategy for Public-Facing Surfaces

## The Voice Problem This Document Solves

ituri-sitrep occupies a narrow credibility corridor. Too institutional and it reads as cosplay — a solo MD student pretending to be WHO. Too casual and LSHTM faculty, WHO DON editors, and ECDC analysts dismiss it as a hobby dashboard. The voice must earn trust the same way the architecture does: through provenance. Every claim traceable to a source. Every limitation named before the reader finds it. Every number grounded to the sentence it came from.

This document defines the tone, structure, ideology, and technical SEO/GEO strategy for all public-facing copy across the application.

---

## 1. Voice Principles

### 1.1 The Our World in Data register, not the WHO register

The WHO writes for ministries of health. Its copy is procedural, cautious, and consensus-driven — appropriate for an intergovernmental body, wrong for a solo-developer tool. The better model is **Our World in Data**: direct, data-forward, self-aware about limitations, and written for a reader who is research-literate but not necessarily domain-expert.

Edouard Mathieu (Head of Data and Research, OWID) described their editorial approach in a 2022 interview with the Hear This Idea podcast: the writing has to be "both very direct and impactful, but also very thorough in making everything extra clear." OWID avoids two failure modes: journalism that "will skim over some things, will exaggerate some points just to make it catchy," and academic writing that "will be way too rigorous, way too boring, way too precise, and get lost in methodology aspects."

ituri-sitrep sits in exactly this register. The reader is a public health trainee, a journalist covering the outbreak, a researcher at LSHTM or ECDC who wants a fast read before opening the WHO DON PDF. They are data-savvy. They do not need simplification. They need **speed, clarity, and honest uncertainty quantification.**

### 1.2 The five voice rules

These are derived from — and deliberately aligned with — WHO's five principles of outbreak communication (trust, announcing early, transparency, listening, and planning), as codified in the 2005 WHO Outbreak Communication Guidelines (WHO/CDS/2005.28) and the 2008 WHO Outbreak Communication Planning Guide. ituri-sitrep is not WHO, but it can embody the same principles through its copy.

1. **State what you know, then what you don't.** WHO's principles place trust and transparency as foundations. ituri-sitrep earns trust not by mimicking WHO's institutional authority but by being more transparent about its own limitations than WHO can afford to be. Say "this figure was extracted by Claude Sonnet 4.6 from the AFRO sitrep dated 22 May 2026; the original sentence reads '...'" — that level of honesty is what distinguishes the site.

2. **Name the disagreement.** When WHO DON says 347 cases and AFRO sitrep says 312, do not pick a winner. Present both, timestamped, with source links. The copy should say: "WHO DON (22 May, 18:00 UTC): 347 suspected. WHO AFRO sitrep (21 May): 312 suspected. The difference reflects reporting lag and differing case inclusion criteria." This is the voice. Do not editorialize. Do not smooth.

3. **Front-load the answer.** Every page, every panel, every tooltip opens with the datum, not the methodology. The methodology is always available (hover, click, /methods page) but the first thing the reader sees is the number, the date, and the source.

4. **Write in active voice, present tense, short sentences.** "This map shows suspected case totals by health zone as of the most recent WHO AFRO sitrep." Not: "The map below has been designed to present an overview of the epidemiological situation as reported in the most recent situation report published by the WHO Regional Office for Africa."

5. **Never claim authority you don't have.** The copy should never say "the outbreak has..." or "the situation is..." as if ituri-sitrep is the source. Instead: "WHO reports that..." or "The DRC MoH press release states..." or "According to the ECDC threat assessment brief dated..." The site is a lens, not a source.

### 1.3 Sentence-level examples

| Bad | Good | Why |
|-----|------|-----|
| "Our advanced AI-powered extraction pipeline ensures the highest accuracy in outbreak data." | "Case numbers are extracted from WHO and AFRO sitreps by Claude Sonnet 4.6 using a strict schema. Every figure links to its source sentence. Extraction accuracy is monitored against a hand-verified gold set." | The bad version claims authority without evidence. The good version describes the mechanism and the verification, letting the reader judge. |
| "The situation continues to evolve rapidly." | "WHO DON 603 (24 May 2026) reported 14 new suspected cases in Irumu health zone since DON 602 (17 May)." | The bad version is a cliché that communicates nothing. The good version is a fact with a source and a timeframe. |
| "Data may be incomplete." | "Numbers from Mambasa and Komanda health zones have not been updated since the AFRO sitrep of 15 May. The gap likely reflects access constraints in those zones rather than an absence of cases." | The bad version is a generic disclaimer. The good version names the specific gap and offers a plausible explanation. |
| "Click here to learn more about our methodology." | "Methods: how we extract, verify, and reconcile numbers from multiple sources →" | Action-oriented link text. "Click here" is an SEO anti-pattern and an accessibility failure. |

---

## 2. Ideological Commitments (The "About" Page Spine)

The copy ideology is expressed through five commitments that appear on the About/Methods page and are implicitly present in every UI element:

### 2.1 Provenance is the product

The single most important sentence on the site: **"Hover any figure on this page to see the exact sentence from the source document it was extracted from."** This is not a feature description. It is the thesis of the project. The provenance tooltip is what makes the site worth visiting instead of reading the WHO DON directly — it gives you the DON's numbers *and* the receipts, across multiple sources, in one view.

### 2.2 Numbers lag and disagree — that is normal

Do not apologize for discrepancies between sources. Explain them. WHO DON, AFRO sitrep, ECDC TAB, DRC MoH, and Africa CDC all report on different cadences with different inclusion criteria. The site shows all of them. This is a strength, not a bug.

### 2.3 This is not an operational tool

The copy must draw a clear, unapologetic line: "If you are a field epidemiologist needing an operational tool, use Go.Data, SORMAS, or DHIS2 Tracker." (Go.Data formally transitioned to an open-source tool in April 2024, hosted under the WHO Open Source Programme Office.) This sentence should appear on the About page, near the top. It earns credibility precisely because it directs the reader elsewhere when elsewhere is better.

### 2.4 Open source, open data, upstream citations

Every extracted datum credits the original source. The site does not ask to be cited itself — it asks readers to cite WHO/AFRO/ECDC/MoH. This posture is what makes LSHTM and WHO comfortable linking to it. A tool that tries to claim credit for WHO's data will be treated as a competitor. A tool that amplifies WHO's data with better navigation and provenance tracking will be treated as an ally.

### 2.5 Built by one person, on weekends

Do not hide the solo-developer nature of the project. State it plainly. "Built by an MD student at the University of Western Australia as a side project. Evaluated accordingly." This is not self-deprecation. It calibrates expectations and, paradoxically, increases trust — the reader knows exactly what they're looking at.

---

## 3. Page-by-Page Copy Architecture

### 3.1 Landing page (map view)

**Above the fold:** The map. No introductory paragraph. The map *is* the introduction. A single line of contextual text sits above or overlaid on the map:

> **Bundibugyo virus disease (ICD-11: 1D60.00) — Ituri Province, DRC**
> {n} suspected cases across {m} health zones as of {date} ({source}).
> Hover any figure for its source sentence.

The "{source}" is a linked reference (e.g., "WHO AFRO Sitrep 12"). The "Hover any..." sentence is the site's one-line value proposition.

**Below the fold:** Three content blocks, each 2–3 sentences max.

1. **What this shows.** "This map displays suspected case totals by DRC health zone, drawn from the most recent WHO AFRO situation report. Colour intensity reflects cumulative suspected cases. Toggle the ACLED conflict overlay to see armed-group activity that may affect health-zone access and reporting."

2. **What this doesn't show.** "Confirmed cases are reported separately when available. Case counts from different sources (WHO DON, AFRO sitrep, ECDC, DRC MoH) often disagree by days and tens of cases. This map uses the AFRO sitrep as the default because it provides the most granular health-zone breakdown. All sources are visible in the zone drill-down."

3. **Who this is for.** "Journalists, public health trainees, and members of the public seeking a fast, sourced overview of the current outbreak. This is not an operational response tool."

### 3.2 Health zone drill-down

**Header:** Zone name, province, population (WorldPop estimate, year).

**Body:** Three tabs or sections:

- **Cases.** Time series chart with one line per source. Each data point is hoverable → source quote tooltip. Below the chart: a small table of the latest figures from each source, with `as_of_date` and a direct link to the source document.

- **Context.** ACLED events in the past 30 days (if any). Health facilities (HOT OSM). Population density. A 1–2 sentence narrative: "Irumu health zone has been the epicentre of the outbreak since mid-April 2026. Access has been intermittently disrupted by armed group activity (ACLED: {n} events in 30 days)."

- **Sources.** Reverse-chronological list of every ingested document that mentions this zone, with extracted quotes highlighted.

### 3.3 Document explorer

Each document gets a card:

- **Title, source, date, document type** (DON, AFRO sitrep, ECDC TAB, etc.)
- **Extracted summary** (LLM-generated, clearly labelled as such): 2–3 sentences.
- **Key numbers** pulled from the document, each with its source quote.
- **Diff against previous document from the same source**: what changed? New zones mentioned? Case count deltas?

The LLM-generated summary must be labelled: "Summary generated by Claude Sonnet 4.6. Extracted numbers are linked to their source sentences below."

### 3.4 "What changed?" brief

Daily. 3–5 bullet points. Each bullet is a claim + a source reference.

> - WHO AFRO Sitrep 12 (22 May) added Mambasa health zone to the affected zone list for the first time. [Source sentence →]
> - ECDC updated its threat assessment to "moderate" for EU/EEA, up from "low" in the 15 May brief. [Source sentence →]
> - No new genomic sequences released on Pathoplexus or Virological.org since 18 May.

Label: "This brief is generated daily by Claude Sonnet 4.6 from changes detected across all ingested sources in the past 24 hours. Every claim links to its source sentence."

### 3.5 Methods page

This is the most important page for institutional credibility and SEO. Structure:

1. **What this site does** (2 sentences)
2. **What this site does not do** (3 sentences — no PHI, no forecasting, not operational)
3. **Data sources** (table: source, format, cadence, licence, link)
4. **Extraction method** (how Claude extracts numbers; the schema; the substring verification; the gold-set validation)
5. **Provenance model** (how source_quote_id works; what the tooltip shows)
6. **Limitations** (reporting lag, access constraints, LLM extraction errors, sources deliberately excluded and why)
7. **Author** (name, affiliation, ORCID, GitHub)
8. **Citation guidance** ("Cite the original WHO/AFRO/ECDC documents, not this site.")
9. **Code and licence** (MIT for code, CC-BY 4.0 for derived data, upstream licences respected)

---

## 4. SEO Strategy

### 4.1 Why this site is YMYL and what that means

ituri-sitrep publishes health information about an active disease outbreak. Google classifies this as Your Money or Your Life (YMYL) content, subject to the highest E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) scrutiny. In its September 11, 2025 update to the Search Quality Rater Guidelines, Google expanded YMYL to cover "Government, Civics & Society" — explicitly including content that affects trust in public institutions and societal well-being. Outbreak dashboards sit squarely in this expanded definition.

For YMYL health content, Google's raters look for: author credentials, editorial process transparency, citations to authoritative sources, clear provenance, and accurate, current information. ituri-sitrep's architecture naturally satisfies most of these if the copy makes them visible.

### 4.2 E-E-A-T signals to embed in copy

**Experience:** "Built by an MD student with field experience (disaster relief in Dominica) and a background in biomedical content development." The author bio on the Methods page should include ORCID, university affiliation, and a link to the GitHub repo.

**Expertise:** The Methods page functions as an editorial-process disclosure. Describe the extraction pipeline, the gold-set validation, the substring verification. This is the equivalent of a medical journal's peer-review disclosure.

**Authoritativeness:** Earned through upstream attribution. Every page links to WHO, AFRO, ECDC, and MoH documents. The site positions itself as a convenience layer over authoritative sources, not as a competing authority. Backlinks from Nextstrain community, Epiverse-TRACE, or ReliefWeb would signal authority to Google.

**Trustworthiness:** Provenance tooltips, source-sentence linking, explicit limitation disclosure, HTTPS, clear contact information, no paywalls, no ads. The "What this site does not do" sections are trust signals. The explicit exclusion of GISAID, line-list data, and social-media scraping is a trust signal.

### 4.3 Technical SEO

**Structured data (JSON-LD) to implement:**

- `WebSite` with `name`, `url`, `author` (Person), `publisher` (Person), `description`.
- `Dataset` on the Methods page (schema.org/Dataset): `name`, `description`, `license`, `creator`, `dateModified`, `spatialCoverage` ("Democratic Republic of the Congo"), `temporalCoverage` ("2026/..."), `distribution` (link to API or data download if applicable), `isBasedOn` (list of upstream WHO/AFRO/ECDC sources). **Note:** Google uses Dataset markup for Google Dataset Search (datasetsearch.research.google.com), not for rich results in the main Google SERP. This is still the right markup for discoverability among researchers using Dataset Search — ituri-sitrep's target audience.
- `Person` for the author: `name`, `affiliation` (Organization: University of Western Australia), `sameAs` (ORCID, GitHub, LinkedIn).
- `Article` or `WebPage` on the daily brief and document explorer pages: `author`, `datePublished`, `dateModified`, `about` (MedicalCondition: Bundibugyo virus disease), `citation` (upstream DON/sitrep URLs).
- `MedicalCondition` (schema.org health extension): `name: "Bundibugyo virus disease"`, `code` (ICD-11: 1D60.00), `relevantSpecialty: "Infectious disease"`.
- `BreadcrumbList` on every page.
- `NewsArticle` on the daily brief pages — this is the recommended schema for timely health announcements following Google's deprecation of `SpecialAnnouncement` on July 31, 2025.

**Meta tags per page type:**

- Landing: `<title>Bundibugyo Virus Outbreak 2026 — Ituri, DRC | Live Map & Source-Linked Data</title>`
- Zone drill-down: `<title>{Zone Name} — BDBV Case Data | ituri-sitrep</title>`
- Document: `<title>{Source} {Date} — Extracted Data & Source Quotes | ituri-sitrep</title>`
- Brief: `<title>What Changed — {Date} | Bundibugyo Outbreak Daily Update</title>`
- Methods: `<title>Methods & Data Sources — How ituri-sitrep Tracks the 2026 Bundibugyo Outbreak</title>`

**URL structure:**

- `/` — map landing
- `/zone/{code}` — health zone drill-down (e.g., `/zone/irumu`)
- `/document/{id}` — source document explorer
- `/brief` or `/brief/{date}` — daily "what changed"
- `/methods` — methods, sources, limitations, author
- `/api` — API documentation (if public read API ships)

**Open Graph / social cards:** Use `@vercel/og` to generate per-page social images. The map landing card should show a simplified choropleth thumbnail. Zone pages show the zone name + latest case count. The brief shows the date + headline change. These drive click-through from social shares and messaging apps.

**Core Web Vitals:** LCP under 2.5s (pre-render the map shell as a Server Component; lazy-load deck.gl layers). INP under 200ms. CLS near zero (reserve space for the map container at SSR time).

**Sitemap and robots.txt:** Dynamic sitemap via `app/sitemap.ts` listing all zone pages and recent briefs. `robots.txt` allows all crawlers. RSS/Atom feed for the daily brief (Google indexes RSS, and it's what health aggregators like ReliefWeb and HealthMap consume).

### 4.4 Keyword strategy

**Primary cluster:** "Bundibugyo virus 2026," "BDBV outbreak DRC," "Ituri Ebola 2026," "DRC outbreak tracker," "Bundibugyo virus disease cases." These are the queries a journalist or trainee types during an active outbreak.

**Secondary cluster:** "open source outbreak dashboard," "public health surveillance tool," "WHO sitrep data extraction," "outbreak data aggregator," "disease outbreak map." These are the queries that bring long-term traffic between outbreaks and position the project for portfolio/career value.

**Long-tail informational:** "how many cases Bundibugyo virus 2026," "Bundibugyo vs Ebola difference," "BDBV health zone map DRC," "what is Bundibugyo virus." The daily brief and the Methods page naturally capture these.

**Content that ranks in YMYL health:** The Methods page is the workhorse. It should be 1,500–2,500 words, structured with clear H2 headings, citing 5–7 authoritative sources inline (WHO, ECDC, AFRO, peer-reviewed papers on LLM extraction). Google's raters specifically look for citations to "professional research, opinions of doctors and scientists, and reputable publications" on health content.

### 4.5 Generative Engine Optimization (GEO)

In 2026, AI search systems (Google AI Overviews, ChatGPT, Perplexity, Claude) increasingly mediate between queries and content. Google AI Overviews now appear on roughly 48–65% of U.S. searches depending on measurement methodology — Ahrefs reported 48% in March 2026 (up 58% year-over-year), while Advanced Web Ranking's 8,000-keyword dataset reached 65% by the same month. Perplexity reports over 100 million monthly active users across all its product surfaces (per Sacra, April 2026). ituri-sitrep should be a source these systems cite when answering questions about the Bundibugyo outbreak.

**Structure content for extraction.** Keep paragraphs to 2–3 sentences. Front-load the answer in the first 200 words of every page. Use precise epidemiological terminology: "suspected cases," "confirmed cases," "case fatality rate," "health zone," not vague synonyms.

**Include original data.** The daily brief and the zone drill-down contain structured, timestamped, multi-source data that AI systems can cite as primary. Yext's analysis of 17.2 million AI citations (Q4 2025) found that first-party websites generate 4.31× more citation occurrences per URL than third-party directory listings — original, structured data on your own domain is what AI systems preferentially cite.

**Cite authoritative sources inline.** Every claim references WHO, AFRO, ECDC, or MoH. AI systems use these upstream citations as trust signals when deciding whether to cite a page.

**Author entity recognition.** The `Person` structured data, the ORCID link, the university affiliation, and the GitHub profile build a knowledge-graph entity that AI systems can verify. This matters more for YMYL content than for general topics.

**Recency.** The daily brief is updated every 24 hours. AI Overviews heavily prefer recently updated content — 85% of AI Overview citations were published within the last two years, with 44% from 2025 alone (Seer Interactive, June 2025 analysis). A continuously updated outbreak tracker has a structural advantage here.

---

## 5. Copy Don'ts

### 5.1 Never use

- "Real-time" — unless you mean sub-minute latency. The site updates every 6 hours at best. Say "regularly updated" or "updated within hours of source publication."
- "AI-powered" as a selling point — describe what the AI does (extract numbers, verify against source text, generate summaries) and let the reader decide if it's impressive.
- "Cutting-edge" / "state-of-the-art" / "revolutionary" — these are marketing words that destroy credibility in a public health context.
- "Dashboard" without qualification — the word has been so overused that it signals "pretty but shallow." Use "situational awareness companion" (the README's term) or simply "outbreak tracker."
- "We" — unless you mean a team. If it's a solo project, use "I" on the About page and passive/impersonal constructions on the data pages ("This map shows..." not "We show...").
- "Powered by Claude" / "Built with AI" as a headline — bury the implementation details in the Methods page. The user cares about the data, not the toolchain.
- "Trusted by..." — until institutions actually link to the site. Do not manufacture credibility.
- "Comprehensive" — because the site explicitly excludes sources (GISAID, line-lists, commercial feeds). Call it "a curated view of public sources."
- "Accurate" as a standalone claim — always qualify: "extraction accuracy is monitored against a hand-verified gold set of {n} documents."

### 5.2 Tone traps to avoid

- **Disaster tourism.** Do not use dramatic language about the outbreak to drive engagement. No "devastating" or "alarming" or "crisis deepens." Report the numbers. Let the reader form their own assessment.
- **Saviour framing.** Do not position the tool as "helping save lives." It aggregates public data. MSF staffs ETUs. The Acknowledgements section in the README gets this right: "building a desk tool is easy; staffing an ETU in Ituri is not."
- **Over-disclaiming.** One clear limitation statement per page is enough. Repeating "this is not medical advice" on every panel reads as defensive, not transparent.
- **Technical self-congratulation.** The architecture documents are excellent — keep them in the repo. The public-facing copy should describe what the user sees, not how it was built. The Methods page is the exception.

---

## 6. Accessibility and Internationalisation

- **Language:** English as the primary language. The outbreak affects DRC (French-speaking) and Uganda (English/Swahili). Consider a French translation of the Methods page and the daily brief as a Stage 3 goal. Use `hreflang` tags when translations ship.
- **Alt text:** Every map, chart, and visualisation needs descriptive alt text. "Choropleth map of DRC health zones in Ituri Province, coloured by suspected Bundibugyo virus case count as of 22 May 2026. Irumu health zone shows the highest count at {n} cases."
- **Plain language:** Avoid jargon where possible, but do not dumb down epidemiological terms. "Case fatality rate" is the correct term; don't replace it with "death rate" (which means something different in epidemiology). Define terms on first use via a tooltip or a glossary link.
- **Reading level:** Aim for Flesch-Kincaid Grade 10–12, comparable to the accessible/explainer register of publications like Scientific American and The Lancet's comment and news sections. Research articles in those publications score significantly higher (grade 14+); the target here is their general-audience layer, not their technical papers.

---

## 7. Summary: The Copy Test

Before publishing any public-facing text, apply this three-part test:

1. **Would an LSHTM DTM&H student find this useful?** If yes, the content level is right. If they'd find it patronising, it's too simple. If they'd need a textbook to follow, it's too dense.

2. **Can every factual claim be traced to a source sentence via the UI?** If not, either add the provenance link or rewrite the claim as a methodological statement (which doesn't need a source because it describes the site's own process).

3. **Would a WHO communications officer be comfortable sharing the link?** Not endorsing it — sharing it. The copy should never put WHO in a position where linking to ituri-sitrep could be read as endorsement of an inaccurate or sensationalist source. The way to achieve this: be more conservative than WHO about claims, more transparent about limitations, and always defer to the original DON/sitrep as the source of truth.

If the copy passes all three, publish.

---

## Appendix A: Key Reference Codes

These codes are used in the extraction schema and should appear correctly wherever they surface in copy or metadata.

| Entity | ICD-11 Code | Notes |
|--------|-------------|-------|
| Bundibugyo virus disease | **1D60.00** | Under 1D60.0 Ebola disease. Not 1D64.0 (invalid). |
| Ebola virus disease (Zaire) | 1D60.01 | The "classic" Ebola species. |
| Sudan virus disease | 1D60.02 | |
| Marburg virus disease | **1D60.10** | Under 1D60.1 Marburg disease. Not 1D24.0 (invalid). |

These should be verified against the WHO ICD-11 browser (icd.who.int) before hardcoding into the extraction schema or structured data.

---

## Appendix B: Fact-Check Log

All specific statistics cited in this document were verified in May 2026. Key sources:

- **WHO five principles of outbreak communication** (trust, announcing early, transparency, listening, planning): WHO Outbreak Communication Planning Guide, 2008 edition (WHO/CDS/2005.28).
- **Edouard Mathieu quotes**: Hear This Idea podcast, Episode 54, 15 October 2022. Title at time of recording: Head of Data; current title: Head of Data and Research.
- **Google YMYL expansion to civic trust**: Google Search Quality Rater Guidelines update, September 11, 2025.
- **AI Overview prevalence**: Ahrefs (March 2026): 48% of searches, up 58% YoY. Advanced Web Ranking / Xponent21 (March 2, 2026): 65.07% of U.S. queries. Semrush (November 2025): 15.69% on a 10M-keyword sample. Methodology and keyword selection account for the wide variance.
- **85% of AI Overview citations within last 2 years**: Seer Interactive, June 2025 analysis.
- **Yext 4.31× citation multiplier**: Yext, "AI Citation Behavior Across Models: Evidence from 17.2 Million Citations," Q4 2025 data. Comparison is first-party websites vs. third-party directory listings, not "original data vs. summaries."
- **Perplexity usage**: ~100M+ MAU across all product surfaces per Sacra (April 2026); ~30–45M standalone MAU per DemandSage (2026); ~170M monthly website visitors.
- **SpecialAnnouncement deprecation**: Google Search Central, effective July 31, 2025.
- **schema.org/Dataset**: Valid schema type, powers Google Dataset Search; does not generate rich results in the main Google SERP.
- **Go.Data open-source transition**: WHO news release, April 24, 2024 (formal launch event hosted by GOARN and WHO OSPO; underlying code on GitHub under GPL-3.0 since 2018).
- **Flesch-Kincaid Grade 10–12**: Appropriate target for accessible science communication. Scientific American and Lancet comment/news sections fall in this range; research articles in those publications typically score grade 14+.
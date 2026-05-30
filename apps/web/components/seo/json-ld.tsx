export function JsonLd({ schema }: Readonly<{ schema: Record<string, unknown> }>) {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- React's required API for dangerouslySetInnerHTML
  const html = { __html: JSON.stringify(schema) };
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires this; input is JSON.stringify output, not user-supplied HTML
      dangerouslySetInnerHTML={html}
    />
  );
}

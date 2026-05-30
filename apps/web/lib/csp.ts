export function buildCsp(nonce: string, embedMode = false): string {
  const frameAncestors = embedMode ? "*" : "'self'";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "worker-src 'self' blob:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://s3.amazonaws.com https://tiles.maps.eox.at`,
    `frame-ancestors ${frameAncestors}`,
  ];
  return `${directives.join("; ")};`;
}

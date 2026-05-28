insert into public.sources (id, slug, name, url, trust_score, license_tier, license_url, attribution_required)
values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  'who-don',
  'WHO Disease Outbreak News',
  'https://www.who.int/emergencies/disease-outbreak-news',
  1.00,
  'open',
  'https://www.who.int/about/policies/publishing/copyright',
  true
) on conflict (slug) do nothing;

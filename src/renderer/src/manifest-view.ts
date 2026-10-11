// Reads display fields from an arcade.json that may not have passed admission,
// so the Rules screen can describe even a broken package without trusting it.

export interface ManifestView {
  title?: string;
  tagline?: string;
  maker?: string;
  license?: string;
  builds: [string, string][];
}

export function viewManifest(manifest: unknown): ManifestView {
  if (typeof manifest !== 'object' || manifest === null) return { builds: [] };
  const fields = manifest as Record<string, unknown>;
  const text = (key: string) => (typeof fields[key] === 'string' ? (fields[key] as string) : undefined);
  const builds =
    typeof fields.builds === 'object' && fields.builds !== null
      ? Object.entries(fields.builds).map(([platform, path]): [string, string] => [platform, String(path)])
      : [];
  return {
    title: text('title'),
    tagline: text('tagline'),
    maker: text('maker'),
    license: text('license'),
    builds,
  };
}

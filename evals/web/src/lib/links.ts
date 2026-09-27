// Route paths. Earlier versions used hash routes (#/d/…, #/r/…); the root layout
// redirects those to the same paths without the hash.
const segment = encodeURIComponent;

export const href = {
  home: () => "/",
  dataset: (dataset: string, skill?: string) => `/d/${segment(dataset)}${skill ? `/${segment(skill)}` : ""}`,
  pair: (dataset: string, skill: string, pair: string) => `/d/${segment(dataset)}/${segment(skill)}/${segment(pair)}`,
  packet: (packet: string, item?: string) => `/r/${segment(packet)}${item ? `/${segment(item)}` : ""}`,
};

/** The path a legacy `#/…` URL referred to, or null. */
export const legacyHashPath = (hash: string): string | null => (/^#\/./.test(hash) ? hash.slice(1) : null);

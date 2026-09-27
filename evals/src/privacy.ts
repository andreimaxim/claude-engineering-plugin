// Publication guards. These catch obvious leaks before a human attests to an export;
// they are not anonymization and do not replace reading the preview.

const secretPatterns: [string, RegExp][] = [
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["API-style secret", /\b(sk|ghp|gho|ghs|xox[bap])[-_][A-Za-z0-9_-]{16,}/],
  ["Amp thread identifier", /\bT-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/],
];

/** Values of credential-like environment variables in the operator's environment. */
function environmentSecrets(): [string, string][] {
  return Object.entries(process.env).flatMap(([key, value]) =>
    value && value.length >= 12 && /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|EMAIL)/i.test(key) ? [[key, value] as [string, string]] : [],
  );
}

export function findLeaks(text: string): string[] {
  const leaks: string[] = [];
  for (const [label, pattern] of secretPatterns) if (pattern.test(text)) leaks.push(label);
  for (const [key, value] of environmentSecrets()) if (text.includes(value)) leaks.push(`value of $${key}`);
  return leaks;
}

/** Rewrite absolute evaluation workspace paths (which embed run identities) as relative paths. */
export const relativizeWorkspacePaths = (text: string): string =>
  text.replace(/(?:file:\/\/)?\/[^\s()[\]"'`<>]*?\/work(?:\/|(?=[\s)\]"'`<>]|$))/g, "");

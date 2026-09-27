import type { Handle } from "@sveltejs/kit";

// Model output is untrusted: no external images, frames, or plugins. Scripts stay
// unrestricted so the portal's injected review widget keeps working.
const securityHeaders = {
  "content-security-policy": "img-src 'self' data:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  for (const [name, value] of Object.entries(securityHeaders)) response.headers.set(name, value);
  return response;
};

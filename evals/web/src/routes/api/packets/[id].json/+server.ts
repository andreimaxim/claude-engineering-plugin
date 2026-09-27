import { error } from "@sveltejs/kit";
import { reviewedFile } from "$lib/server/results";
import type { RequestHandler } from "./$types";

// Exact bytes of an allowlisted reviewed file; anything else is 404.
export const GET: RequestHandler = async ({ params }) => {
  const bytes = await reviewedFile("packets", params.id);
  if (!bytes) error(404, "Not found");
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};

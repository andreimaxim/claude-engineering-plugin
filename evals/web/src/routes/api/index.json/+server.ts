import { json } from "@sveltejs/kit";
import { resultsIndex } from "$lib/server/results";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => json(await resultsIndex(), { headers: { "cache-control": "no-store" } });

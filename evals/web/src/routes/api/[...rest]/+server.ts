import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Unknown API paths are 404, never the app shell.
export const GET: RequestHandler = () => error(404, "Not found");

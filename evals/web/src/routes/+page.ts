import { error } from "@sveltejs/kit";
import type { ResultsIndex } from "$lib/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const response = await fetch("/api/index.json");
  if (!response.ok) error(response.status, "Could not load the results index");
  return { index: (await response.json()) as ResultsIndex };
};

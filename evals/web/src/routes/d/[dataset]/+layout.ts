import { error } from "@sveltejs/kit";
import type { Dataset } from "$lib/types";
import type { LayoutLoad } from "./$types";

// Loaded once per dataset; skill and pair pages reuse it during navigation.
export const load: LayoutLoad = async ({ fetch, params }) => {
  const response = await fetch(`/api/datasets/${encodeURIComponent(params.dataset)}.json`);
  if (!response.ok) error(response.status, response.status === 404 ? "No such dataset" : "Could not load the dataset");
  return { dataset: (await response.json()) as Dataset };
};

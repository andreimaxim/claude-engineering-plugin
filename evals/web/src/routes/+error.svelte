<script lang="ts">
  import { page } from "$app/state";
  import { href } from "$lib/links";
</script>

<svelte:head><title>{page.status} · Skill evaluations</title></svelte:head>

<div class="page">
  <div class="callout bad pad" role="alert">
    {page.status === 404 ? "Page not found." : `Could not load: ${page.error?.message ?? "unknown error"}`}
    <a href={href.home()}>Go home</a>.
  </div>
</div>

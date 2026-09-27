<script lang="ts">
  import "../app.css";
  import { afterNavigate, goto } from "$app/navigation";
  import { href, legacyHashPath } from "$lib/links";

  let { children } = $props();

  // Earlier versions used hash routes such as /#/d/<dataset>; keep those links
  // working once the router has finished its initial navigation.
  function redirectLegacyHash() {
    const path = legacyHashPath(window.location.hash);
    if (path) goto(path, { replaceState: true });
  }
  afterNavigate(({ type }) => {
    if (type === "enter") redirectLegacyHash();
  });
</script>

<svelte:window onhashchange={redirectLegacyHash} />

<a class="skip-link" href="#main">Skip to content</a>
<header class="app-bar">
  <a class="brand" href={href.home()}>Engineering skill evaluations</a>
</header>
<main id="main">
  {@render children()}
</main>

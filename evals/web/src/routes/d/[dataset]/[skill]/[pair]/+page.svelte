<script lang="ts">
  import { page } from "$app/state";
  import PairView from "$lib/components/PairView.svelte";

  let { data } = $props();
</script>

<PairView dataset={data.dataset} skill={page.params.skill ?? ""} pairId={page.params.pair ?? ""} />

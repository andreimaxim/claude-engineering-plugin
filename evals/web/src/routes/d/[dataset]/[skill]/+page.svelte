<script lang="ts">
  import { page } from "$app/state";
  import DatasetView from "$lib/components/DatasetView.svelte";

  let { data } = $props();
</script>

<DatasetView dataset={data.dataset} skill={page.params.skill ?? null} />

<script lang="ts">
  import DatasetView from "$lib/components/DatasetView.svelte";

  let { data } = $props();
</script>

<DatasetView dataset={data.dataset} skill={null} />

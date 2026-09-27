<script lang="ts">
  import { fileAsMarkdown } from "$lib/markdown";
  import Markdown from "./Markdown.svelte";

  let { path, content }: { path: string; content: string } = $props();
</script>

<Markdown text={fileAsMarkdown(path, content)} />

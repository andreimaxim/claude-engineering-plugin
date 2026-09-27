<script lang="ts">
  type DiffFile = { path: string; lines: string[]; added: number; removed: number; binary: boolean };

  let { diff }: { diff: string } = $props();

  function parse(text: string): DiffFile[] {
    const files: DiffFile[] = [];
    let current: DiffFile | null = null;
    for (const line of text.split("\n")) {
      const header = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      if (header) {
        current = { path: header[2] ?? header[1] ?? "file", lines: [], added: 0, removed: 0, binary: false };
        files.push(current);
        continue;
      }
      if (!current) continue;
      if (/^(index |--- |\+\+\+ |new file mode|deleted file mode|similarity index|rename (from|to))/.test(line)) continue;
      if (line.startsWith("Binary files") || line.startsWith("GIT binary patch")) current.binary = true;
      if (line.startsWith("+")) current.added += 1;
      else if (line.startsWith("-")) current.removed += 1;
      current.lines.push(line);
    }
    return files;
  }

  const lineClass = (line: string) =>
    line.startsWith("@@") ? "hunk" : line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx";

  const files = $derived(parse(diff));
</script>

{#if !diff.trim()}
  <p class="muted">No workspace changes.</p>
{:else}
  <div class="diff">
    {#each files as file (file.path)}
      <details class="diff-file" open={file.lines.length < 400}>
        <summary>
          <code>{file.path}</code>
          <span class="diff-stat"><span class="add-count">+{file.added}</span> <span class="del-count">−{file.removed}</span></span>
        </summary>
        {#if file.binary}
          <p class="muted">Binary change not shown.</p>
        {:else}
          <pre class="diff-lines">{#each file.lines as line, index (index)}<span class="diff-line {lineClass(line)}">{line || " "}{"\n"}</span>{/each}</pre>
        {/if}
      </details>
    {/each}
  </div>
{/if}

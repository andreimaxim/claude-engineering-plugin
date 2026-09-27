<script lang="ts" generics="T extends string">
  let { legend, name, options, value, onchange }: {
    legend: string;
    name: string;
    options: [T, string][];
    value: T | null;
    onchange: (value: T) => void;
  } = $props();
</script>

<fieldset class="choice">
  <legend>{legend}</legend>
  <div class="segmented">
    {#each options as [option, label] (option)}
      <label class={value === option ? "selected" : undefined}>
        <input type="radio" {name} value={option} checked={value === option} onchange={() => onchange(option)} />
        {label}
      </label>
    {/each}
  </div>
</fieldset>

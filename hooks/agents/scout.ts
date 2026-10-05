import type { AgentSpec } from 'claude-code'

// The system prompt is prompts/scout.md, adapted from
// https://github.com/cursor/plugins/blob/main/pstack/skills/blast-radius/SKILL.md
export const scout = {
  name: 'scout',
  description:
    'Investigates proposed software changes. Use before implementation when consequences for consumers, stored data, behavior, or compatibility require substantial investigation.',
  model: 'sonnet',
  effort: 'high',
  tools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash', 'WebSearch', 'WebFetch'],
} satisfies Omit<AgentSpec, 'prompt'>

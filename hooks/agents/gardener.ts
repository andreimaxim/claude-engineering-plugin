import type { AgentSpec } from 'claude-code'

// The system prompt is prompts/gardener.md.
export const gardener = {
  name: 'gardener',
  description:
    'Investigates existing code and proposes concrete improvements to its design, maintainability, and testability. Use for substantial structural or maintainability analysis.',
  model: 'sonnet',
  effort: 'high',
  tools: ['Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash', 'WebSearch', 'WebFetch'],
} satisfies Omit<AgentSpec, 'prompt'>

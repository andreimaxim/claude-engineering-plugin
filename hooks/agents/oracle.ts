import type { AgentSpec } from 'claude-code'

// The system prompt is prompts/oracle.md.
export const oracle = {
  name: 'oracle',
  description:
    'Read-only expert advisor for focused code reviews, difficult debugging, and consequential architecture questions. Use when explicitly requested or when direct investigation leaves a specific high-impact question unresolved.',
  model: 'fable',
  effort: 'high',
  tools: ['Read', 'Glob', 'Grep', 'Bash'],
} satisfies Omit<AgentSpec, 'prompt'>

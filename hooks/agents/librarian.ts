import type { AgentSpec } from 'claude-code'

// The system prompt is prompts/librarian.md.
export const librarian = {
  name: 'librarian',
  description:
    'Researches code in local workspaces and external repositories. Use for multi-step code discovery, behavior and architecture questions, dependency research, and commit history. Use direct reads or rg for known paths and exact symbols.',
  model: 'sonnet',
  effort: 'high',
  tools: ['Read', 'Glob', 'Grep', 'Bash', 'WebSearch', 'WebFetch'],
} satisfies Omit<AgentSpec, 'prompt'>

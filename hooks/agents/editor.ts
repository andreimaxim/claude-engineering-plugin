import type { AgentSpec } from 'claude-code'

// The system prompt is prompts/editor.md.
export const editor = {
  name: 'editor',
  description:
    'Edits supplied drafts for clarity and flow while preserving meaning. Use it to improve sentence and paragraph structure and remove AI writing patterns in documentation, model instructions, and other substantial text. Editor has no tools and cannot read files, so include the full draft text, intended audience, tone, and constraints in the brief. Returns the revised text, followed by any notes after a line containing `--- Editor notes ---`. The caller applies the edits.',
  model: 'opus',
  effort: 'low',
  tools: [],
} satisfies Omit<AgentSpec, 'prompt'>

import type { Register } from 'claude-code'

export const MISSING_TASK =
  'The editor tool needs a `task` containing the full draft text to revise, plus the intended audience, tone, and constraints. Editor cannot read files, URLs, or this conversation, so paste the contents instead of a path or reference.'

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'editor',
      description:
        'Revise a supplied draft with Editor, using Opus at low effort. It improves sentence and paragraph structure and removes AI writing patterns while preserving meaning. Supply the draft and a self-contained brief. Editor has no tools, file access, or conversation history. It returns the revised text, followed by any notes after a line containing `--- Editor notes ---`. The caller reads files and applies edits.',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            minLength: 1,
            description:
              'The draft text, intended audience, requested tone, constraints, and any supporting context or source excerpts. Include the contents to revise, not just file paths or URLs.',
          },
        },
        required: ['task'],
        additionalProperties: false,
      },
    })

    return next(e)
  })

  on('tool.call', { tool: 'mcp__engineering__editor' }, async ($, e) => {
    if (typeof e.task !== 'string' || !e.task.trim()) {
      return { deny: MISSING_TASK }
    }

    const reply = await $.model.complete({
      model: 'opus',
      effort: 'low',
      maxTokens: 32000,
      system: await $.fs.read(`${$.plugin.root}/prompts/editor.md`),
      prompt: e.task,
    })

    return reply.isAnswered ? { result: reply.text } : { deny: `Editor failed: ${reply.reason}` }
  })
}

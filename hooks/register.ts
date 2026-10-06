import type { Register } from 'claude-code'
import { gardener } from './agents/gardener'
import { librarian } from './agents/librarian'
import { oracle } from './agents/oracle'
import { scout } from './agents/scout'
import { drawEditorRow, editor, hideEditorResult, reviseDraft } from './tools/editor'

export const AGENT_NOT_REGISTERED = 'normal-swe could not register the agent'

const AGENTS = [oracle, librarian, scout, gardener]

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.tool.register(editor)

    // A hook that throws is skipped whole, so one failed agent must not cost the others.
    for (const agent of AGENTS) {
      try {
        await $.agent.register({
          ...agent,
          prompt: await $.fs.read(`${$.plugin.root}/prompts/${agent.name}.md`),
        })
      } catch (error) {
        $.ui.log(`${AGENT_NOT_REGISTERED} ${agent.name}: ${error}`)
      }
    }

    return next(e)
  })

  on('tool.call', { tool: 'mcp__normal-swe__editor' }, reviseDraft)
  on(
    'ui.render',
    { component: 'ToolUse', props: { tool: 'mcp__normal-swe__editor' } },
    drawEditorRow,
  )
  on(
    'ui.render',
    { component: 'ToolResult', props: { tool: 'mcp__normal-swe__editor' } },
    hideEditorResult,
  )
}

import type { Register } from 'claude-code'
import { editor } from './agents/editor'
import { gardener } from './agents/gardener'
import { librarian } from './agents/librarian'
import { oracle } from './agents/oracle'

export const AGENT_NOT_REGISTERED = 'normal-swe could not register the agent'

const AGENTS = [oracle, librarian, gardener, editor]

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
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
}

import type { ModelCompleteRequest } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { MISSING_TASK } from './register'

const TOOL = 'mcp__engineering__editor'
const USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}

test('the editor tool is offered to the model when a session starts', async ($, on) => {
  const registered: string[] = []

  on('tool.register', ($, e) => {
    registered.push(`mcp__engineering__${e.name}`)
    return { value: { tool: `mcp__engineering__${e.name}` } }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })

  expect(registered).toEqual([TOOL])
})

test('a draft is revised with the Editor instructions by Opus at low effort', async ($, on) => {
  const requests: ModelCompleteRequest[] = []

  on('tool.register', ($, e) => ({ value: { tool: `mcp__engineering__${e.name}` } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.read', ($, e) =>
    e.path.endsWith('/prompts/editor.md')
      ? { value: 'EDITOR PROMPT' }
      : { deny: `No such file: ${e.path}` },
  )
  on('model.complete', ($, e) => {
    requests.push(e)
    return { value: { isAnswered: true, text: 'Revised draft.', usage: USAGE } }
  })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  const reply = await $.tool.call({ tool: TOOL, task: 'Draft: It serves as a robust foundation.' })

  expect(reply.result).toBe('Revised draft.')
  expect(requests).toHaveLength(1)
  expect(requests[0]?.model).toBe('opus')
  expect(requests[0]?.effort).toBe('low')
  expect(requests[0]?.maxTokens).toBe(32000)
  expect(requests[0]?.system).toBe('EDITOR PROMPT')
  expect(requests[0]?.prompt).toBe('Draft: It serves as a robust foundation.')
})

test('a model failure is reported to the caller', async ($, on) => {
  on('tool.register', ($, e) => ({ value: { tool: `mcp__engineering__${e.name}` } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.read', () => ({ value: 'EDITOR PROMPT' }))
  on('model.complete', () => ({
    value: {
      isAnswered: false,
      reason: 'api-error',
      status: 529,
      error: 'overloaded',
      usage: USAGE,
    },
  }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  const reply = await $.tool.call({ tool: TOOL, task: 'Draft: It serves as a robust foundation.' })

  expect(reply.deny).toBe('Editor failed: api-error')
})

test('a request without draft text is refused before it reaches the model', async ($, on) => {
  let calls = 0

  on('tool.register', ($, e) => ({ value: { tool: `mcp__engineering__${e.name}` } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('model.complete', () => {
    calls++
    return { value: { isAnswered: true, text: '', usage: USAGE } }
  })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  const reply = await $.tool.call({ tool: TOOL, task: '   ' })

  expect(reply.deny).toBe(MISSING_TASK)
  expect(calls).toBe(0)
})

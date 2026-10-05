import type { ModelCompleteRequest } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import { AGENT_NOT_REGISTERED } from './register'
import { MISSING_TASK } from './tools/editor'

const TOOL = 'mcp__normal-swe__editor'
const PROMPT_PATH = /\/prompts\/(editor|oracle|librarian|scout|gardener)\.md$/
const USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
}

test('the editor tool is offered to the model when a session starts', async ($, on) => {
  const registered: string[] = []

  on('tool.register', ($, e) => {
    registered.push(`mcp__normal-swe__${e.name}`)
    return { value: { tool: `mcp__normal-swe__${e.name}` } }
  })
  on('agent.register', ($, e) => ({ value: { agent: `normal-swe:${e.name}` } }))
  on('fs.read', ($, e) =>
    PROMPT_PATH.test(e.path) ? { value: 'PROMPT' } : { deny: `No such file: ${e.path}` },
  )
  on('session.start', ($, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })

  expect(registered).toEqual([TOOL])
})

test('the four agents are offered with their own description, instructions, model, effort, and tools when a session starts', async ($, on) => {
  const agents = new Map<string, Record<string, unknown>>()

  on('tool.register', ($, e) => ({ value: { tool: `mcp__normal-swe__${e.name}` } }))
  on('agent.register', ($, e) => {
    agents.set(e.name, e)
    return { value: { agent: `normal-swe:${e.name}` } }
  })
  on('fs.read', ($, e) => {
    const name = PROMPT_PATH.exec(e.path)?.[1]
    return name ? { value: `${name.toUpperCase()} PROMPT` } : { deny: `No such file: ${e.path}` }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })

  expect([...agents.keys()].sort()).toEqual(['gardener', 'librarian', 'oracle', 'scout'])

  expect(agents.get('oracle')?.description).toBe(
    'Read-only expert advisor for focused code reviews, difficult debugging, and consequential architecture questions. Use when explicitly requested or when direct investigation leaves a specific high-impact question unresolved.',
  )
  expect(agents.get('oracle')?.prompt).toBe('ORACLE PROMPT')
  expect(agents.get('oracle')?.model).toBe('fable')
  expect(agents.get('oracle')?.effort).toBe('high')
  expect(agents.get('oracle')?.tools).toEqual(['Read', 'Glob', 'Grep', 'Bash'])

  expect(agents.get('librarian')?.description).toBe(
    'Researches code in local workspaces and external repositories. Use for multi-step code discovery, behavior and architecture questions, dependency research, and commit history. Use direct reads or rg for known paths and exact symbols.',
  )
  expect(agents.get('librarian')?.prompt).toBe('LIBRARIAN PROMPT')
  expect(agents.get('librarian')?.model).toBe('sonnet')
  expect(agents.get('librarian')?.effort).toBe('high')
  expect(agents.get('librarian')?.tools).toEqual([
    'Read',
    'Glob',
    'Grep',
    'Bash',
    'WebSearch',
    'WebFetch',
  ])

  expect(agents.get('scout')?.description).toBe(
    'Investigates proposed software changes. Use before implementation when consequences for consumers, stored data, behavior, or compatibility require substantial investigation.',
  )
  expect(agents.get('scout')?.prompt).toBe('SCOUT PROMPT')
  expect(agents.get('scout')?.model).toBe('sonnet')
  expect(agents.get('scout')?.effort).toBe('high')
  expect(agents.get('scout')?.tools).toEqual([
    'Read',
    'Glob',
    'Grep',
    'Edit',
    'Write',
    'Bash',
    'WebSearch',
    'WebFetch',
  ])

  expect(agents.get('gardener')?.description).toBe(
    'Investigates existing code and proposes concrete improvements to its design, maintainability, and testability. Use for substantial structural or maintainability analysis.',
  )
  expect(agents.get('gardener')?.prompt).toBe('GARDENER PROMPT')
  expect(agents.get('gardener')?.model).toBe('sonnet')
  expect(agents.get('gardener')?.effort).toBe('high')
  expect(agents.get('gardener')?.tools).toEqual([
    'Read',
    'Glob',
    'Grep',
    'Edit',
    'Write',
    'Bash',
    'WebSearch',
    'WebFetch',
  ])
})

test('an agent that cannot be registered is reported without losing the editor tool or the other agents', async ($, on) => {
  const tools: string[] = []
  const agents: string[] = []
  const logged: string[] = []

  on('tool.register', ($, e) => {
    tools.push(`mcp__normal-swe__${e.name}`)
    return { value: { tool: `mcp__normal-swe__${e.name}` } }
  })
  on('agent.register', ($, e) => {
    if (e.name === 'oracle') return { deny: 'refused by policy' }
    agents.push(e.name)
    return { value: { agent: `normal-swe:${e.name}` } }
  })
  on('fs.read', ($, e) =>
    PROMPT_PATH.test(e.path) ? { value: 'PROMPT' } : { deny: `No such file: ${e.path}` },
  )
  on('ui.log', ($, e) => {
    logged.push(e.text)
    return { value: undefined }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })

  expect(tools).toEqual([TOOL])
  expect(agents).toEqual(['librarian', 'scout', 'gardener'])
  expect(logged).toHaveLength(1)
  expect(logged[0]).toStartWith(`${AGENT_NOT_REGISTERED} oracle: `)
})

test('a draft is revised with the Editor instructions by Opus at low effort', async ($, on) => {
  const requests: ModelCompleteRequest[] = []

  on('tool.register', ($, e) => ({ value: { tool: `mcp__normal-swe__${e.name}` } }))
  on('agent.register', ($, e) => ({ value: { agent: `normal-swe:${e.name}` } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.read', ($, e) => {
    const name = PROMPT_PATH.exec(e.path)?.[1]
    return name ? { value: `${name.toUpperCase()} PROMPT` } : { deny: `No such file: ${e.path}` }
  })
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
  on('tool.register', ($, e) => ({ value: { tool: `mcp__normal-swe__${e.name}` } }))
  on('agent.register', ($, e) => ({ value: { agent: `normal-swe:${e.name}` } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.read', () => ({ value: 'PROMPT' }))
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

  on('tool.register', ($, e) => ({ value: { tool: `mcp__normal-swe__${e.name}` } }))
  on('agent.register', ($, e) => ({ value: { agent: `normal-swe:${e.name}` } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.read', () => ({ value: 'PROMPT' }))
  on('model.complete', () => {
    calls++
    return { value: { isAnswered: true, text: '', usage: USAGE } }
  })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  const reply = await $.tool.call({ tool: TOOL, task: '   ' })

  expect(reply.deny).toBe(MISSING_TASK)
  expect(calls).toBe(0)
})

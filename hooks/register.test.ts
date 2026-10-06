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

const EDITOR_ROW = {
  tool_use_id: 'call-1',
  tool: TOOL,
  input: { task: "Revise the draft below.\n\nIn today's fast-paced development landscape..." },
  isRunning: true,
  isErrored: false,
  isInterrupted: false,
}

const BASH_ROW = {
  tool_use_id: 'call-2',
  tool: 'Bash',
  input: { command: 'ls', description: 'List files' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
}

test('the transcript row of an editor call is one dim line that names what Editor is doing, never the draft', async ($, on) => {
  const engineDrew: unknown[] = []
  on('ui.render', ($, e) => {
    engineDrew.push(e.props)
    return { type: 'Text', children: [] }
  })

  const line = (text: string) => ({
    type: 'Box',
    props: { marginTop: 1, marginLeft: 2 },
    children: [{ type: 'Text', props: { dimColor: true }, children: [text] }],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'normal-swe',
      surface,
      component: 'ToolUse',
      props: EDITOR_ROW,
    })

    expect(await ui.drawn()).toEqual(line('Asking the Editor to revise a draft…'))

    await ui.redraw({ ...EDITOR_ROW, isRunning: false, output: 'REVISED' })
    expect(await ui.drawn()).toEqual(line('Asked the Editor to revise a draft.'))

    await ui.redraw({ ...EDITOR_ROW, isRunning: false, isErrored: true, output: 'Editor failed' })
    expect(await ui.drawn()).toEqual(line('The Editor could not revise the draft.'))

    // An abort marks the call both interrupted and errored.
    await ui.redraw({ ...EDITOR_ROW, isRunning: false, isErrored: true, isInterrupted: true })
    expect(await ui.drawn()).toEqual(line('The Editor was interrupted.'))

    await ui.unmount()
  }

  expect(engineDrew).toEqual([])
})

test("the revised text is not drawn under the editor's transcript row, but a failure's reason is", async ($, on) => {
  const engineDrew: unknown[] = []
  on('ui.render', ($, e) => {
    engineDrew.push(e.props)
    return { type: 'Text', children: ['ENGINE'] }
  })

  const result = { tool_use_id: 'call-1', tool: TOOL, output: 'REVISED', isErrored: false }

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'normal-swe',
      surface,
      component: 'ToolResult',
      props: result,
    })

    expect(await ui.drawn()).toEqual({ type: 'Box', props: { display: 'none' } })
    expect(engineDrew).toEqual([])

    await ui.redraw({ ...result, output: 'Editor failed: no answer', isErrored: true })
    expect(await ui.drawn()).toEqual({ type: 'Text', children: ['ENGINE'] })
    expect(engineDrew).toEqual([{ ...result, output: 'Editor failed: no answer', isErrored: true }])

    await ui.unmount()
    engineDrew.length = 0
  }
})

test("the transcript rows of another tool's call are drawn as the engine has them", async ($, on) => {
  const engineDrew: unknown[] = []
  on('ui.render', ($, e) => {
    engineDrew.push(e.props)
    return { type: 'Text', children: [e.component] }
  })

  const row = await $.ui.render({
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 'call-2',
    props: BASH_ROW,
  })
  const result = await $.ui.render({
    surface: 'terminal',
    component: 'ToolResult',
    requestId: 'call-2',
    props: {
      tool_use_id: 'call-2',
      tool: 'Bash',
      output: { stdout: '', stderr: '' },
      isErrored: false,
    },
  })

  expect(row).toEqual({ type: 'Text', children: ['ToolUse'] })
  expect(result).toEqual({ type: 'Text', children: ['ToolResult'] })
  expect(engineDrew).toEqual([
    BASH_ROW,
    { tool_use_id: 'call-2', tool: 'Bash', output: { stdout: '', stderr: '' }, isErrored: false },
  ])
})

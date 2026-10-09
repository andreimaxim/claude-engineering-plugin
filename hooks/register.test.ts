import { expect, test } from 'claude-code/testing'
import { AGENT_NOT_REGISTERED } from './register'

const PROMPT_PATH = /\/prompts\/(editor|oracle|librarian|gardener)\.md$/

test('the four agents are offered with their own description, instructions, model, effort, and tools when a session starts', async ($, on) => {
  const agents = new Map<string, Record<string, unknown>>()

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

  expect([...agents.keys()].sort()).toEqual(['editor', 'gardener', 'librarian', 'oracle'])

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

  expect(agents.get('editor')?.description).toBe(
    'Edits supplied drafts for clarity and flow while preserving meaning. Use it to improve sentence and paragraph structure and remove AI writing patterns in documentation, model instructions, and other substantial text. Editor has no tools and cannot read files, so include the full draft text, intended audience, tone, and constraints in the brief. Returns the revised text, followed by any notes after a line containing `--- Editor notes ---`. The caller applies the edits.',
  )
  expect(agents.get('editor')?.prompt).toBe('EDITOR PROMPT')
  expect(agents.get('editor')?.model).toBe('opus')
  expect(agents.get('editor')?.effort).toBe('low')
  expect(agents.get('editor')?.tools).toEqual([])
})

test('an agent that cannot be registered is reported without losing the other agents', async ($, on) => {
  const agents: string[] = []
  const logged: string[] = []

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

  expect(agents).toEqual(['librarian', 'gardener', 'editor'])
  expect(logged).toHaveLength(1)
  expect(logged[0]).toStartWith(`${AGENT_NOT_REGISTERED} oracle: `)
})

# Testing

This guide explains how to check changes to this plugin: which commands to run, how the tests
work, how to write new ones, and how to try the subagents in a real session or find out why they
are missing.

The tests live next to the code they cover. [hooks/register.ts](hooks/register.ts) registers
the subagents, and [hooks/register.test.ts](hooks/register.test.ts) tests
them with Claude Code's plugin test kit, `claude-code/testing`. The tests check how each subagent
is registered: its description, prompt file, model, effort, and tools. Skills and prompts are
instructions for the model, so no automated test covers how well they work. Check those with
`claude plugin validate` and an end-to-end run.

## Set up

The tests and the hooks module run on the Bun runtime built into Claude Code, so they need only
the `claude` binary. The type-check, lint, and format commands also need Bun, oxlint, and oxfmt.
[mise.toml](mise.toml) declares them and [mise.lock](mise.lock) pins their exact versions.
Install them with [mise](https://mise.jdx.dev/):

```sh
mise trust
mise install
```

Claude Code 2.1.289 embeds Bun 1.4.3, which is not published. `mise.toml` requests Bun 1.4, so
mise installs 1.4.2. oxlint and oxfmt install as standalone binaries, so none of these commands
need Node.js.

## Commands

Run these from the repository root.

```sh
claude plugin validate .                       # Check both manifests and the hooks module
claude plugin test .                           # Run every *.test.ts file; no model is called
bunx --package typescript@5 tsc -p .           # Type-check the hooks module and its tests
oxlint hooks                                   # Lint the hooks module and its tests
oxfmt --check hooks                            # Check formatting; `oxfmt hooks` fixes it
claude -p --plugin-dir . "<request>"           # Run the working copy end to end with a real model
claude -p --debug --plugin-dir . "<request>"   # The same, writing a debug log
```

`claude plugin validate .` checks the marketplace and plugin manifests. It also reads the hooks
module the way Claude Code loads it, lists the events the module hooks and the `$` calls it makes,
and reports anything the engine would refuse. Expect two warnings, for the missing `version` and
for the root `CLAUDE.md`. [CONTRIBUTING.md](CONTRIBUTING.md#check-the-manifests) explains both.

`claude plugin test .` runs every `*.test.ts` and `*.test.tsx` file under the folder and exits 1
when a test fails. It has no option to run a single file or test. The tests never call a model, so
they finish in well under a second.

`tsc -p .` needs TypeScript 5.4 or newer, the root `tsconfig.json`, and the type declarations in
`.claude-plugin/types/`. Claude Code writes those files the first time it loads the plugin from
this folder, for example during an end-to-end run, and Git ignores them. Until that first load,
`tsc -p .` fails because `tsconfig.json` does not exist.

`oxlint hooks` applies oxlint's default rules. `oxfmt` reads [.oxfmtrc.json](.oxfmtrc.json),
which sets no semicolons and single quotes and keeps oxfmt's defaults otherwise. Run
`oxfmt hooks` before committing a change to the hooks module.

`claude -p --plugin-dir .` loads the working copy instead of any installed copy of the plugin. It
calls the real model, so it costs tokens. Use it to check what the tests cannot show, as described
in [End-to-end checks](#end-to-end-checks).

## How the test kit works

A test file imports its kit from `claude-code/testing`:

```ts
import { expect, test } from 'claude-code/testing'
```

Each test body receives `$` and `on`. `$` is the engine's own interface, and the plugin's hooks
run through it as they do in a session. In a test, however, the engine has no implementation of
its own. The hooks the test registers with `on` sit beneath the plugin and stand in for the
engine, and nothing runs beneath them. There is no model, file system, network, or process.

The test must therefore answer every engine call the plugin makes. A call that nothing answers
fails with `no implementation for <event>`. Starting a session needs three answers, because the
module's `session.start` hook reads each subagent's prompt and registers the subagent:

```ts
on('agent.register', ($, e) => ({ value: { agent: `normal-swe:${e.name}` } }))
on('session.start', ($, e) => ({ cwd: e.cwd }))
on('fs.read', () => ({ value: 'PROMPT' }))
```

Answers take one of two shapes:

- Operations the plugin calls on `$`, such as `$.agent.register`, `$.fs.read`, and
  `$.ui.log`, take `{ value }` or `{ deny }`. The engine skips any other answer and reports
  `returned neither { value } nor { deny }`.
- Events, such as `session.start`, take the event's own result, here `{ cwd }`.

The plugin loads at the test's first call on `$`, so register the test's hooks before that call.
The kit's `mock` covers only `$.clock`, `$.store`, and `$.env.get`. Answer every other call with
`on`.

When a test fails, the output lists each hook the engine skipped and why. Read that list first,
because a skipped stand-in usually explains the assertion failure that follows.

```text
the engine reported:
  test's agent.register hook was skipped: test: returned neither { value } nor { deny }
  [normal-swe] $.ui.log dropped: HooksError: no implementation for ui.log
```

Each test has 5 seconds. To change that, pass `{ timeoutMs }` as the second argument to `test`.
A test can import from the module it tests, such as the exported `AGENT_NOT_REGISTERED` message.

## Testing approach

Treat tests as executable specifications of what the plugin does at the engine boundary: what it
registers and what it reports when registration fails. Assert those outcomes, not the steps the
plugin takes to produce them. A refactoring that registers the same agents and reports the same
failures should not require test changes.

Because the test answers every engine call, make each answer behave like the real engine. A
file-system stand-in that returns the prompt for any path would let a wrong path pass. Answer
only the real path, and assert on the outcome that depends on it:

```ts
// Good — a wrong path is refused, and the registered prompt proves the right file was read
on('fs.read', ($, e) => {
  const name = PROMPT_PATH.exec(e.path)?.[1]
  return name ? { value: `${name.toUpperCase()} PROMPT` } : { deny: `No such file: ${e.path}` }
})

expect(agents.get('editor')?.prompt).toBe('EDITOR PROMPT')

// Bad — records how the prompt is loaded instead of what the agent receives
on('fs.read', ($, e) => {
  reads.push(e.path)
  return { value: 'EDITOR PROMPT' }
})

expect(reads).toEqual([expect.stringMatching(/\/prompts\/editor\.md$/)])
```

Record calls to an operation only when the call itself is the behavior under test, as with the
agents passed to `agent.register`.

## Test names state facts

Name each test as a fact about the plugin, in words a plugin user would understand. Name the
behavior, not the code that exercises it, and include the condition when it distinguishes the case.

```ts
// Good — facts about the plugin
test('the four agents are offered with their own description, instructions, model, effort, and tools when a session starts', ...)
test('an agent that cannot be registered is reported without losing the other agents', ...)

// Bad — names code and calls
test('calls agent.register for each entry in AGENTS', ...)
test('catches a denied agent.register and calls ui.log', ...)
```

Read together, the names should describe the plugin's hooks module:

- The four agents are offered with their own description, instructions, model, effort, and tools
  when a session starts.
- An agent that cannot be registered is reported without losing the other agents.

Give a behavior its own test when it is part of the plugin's contract or can break independently.
A refused agent is an example, because the module can stop registering after a refusal while every
agent's configuration stays correct. Do not add a test for a fact that another test already proves.

## Use whitespace to show structure

Separate arrange, act, and assert with blank lines. In these tests, the engine stand-ins are the
arrangement, and starting the session is the act:

```ts
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
```

## Keep expectations separate and visible

Assert each expectation separately, so a failure names what broke. Assert which agents were
registered separately from how each is configured:

```ts
// Good — the set of agents and each field fail on their own
expect([...agents.keys()].sort()).toEqual(['editor', 'gardener', 'librarian', 'oracle'])
expect(agents.get('editor')?.model).toBe('opus')
expect(agents.get('editor')?.tools).toEqual([])

// Bad — one failure for any difference, and tools is not checked at all
expect(agents.get('editor')).toEqual(expect.objectContaining({ model: 'opus', effort: 'low' }))
```

Write each test's stand-ins and assertions in the test rather than in shared helpers. Small
shared constants such as `PROMPT_PATH` are fine.

Compare long messages to the constant the module exports, rather than copying the text or
checking a fragment:

```ts
// Good
expect(logged[0]).toStartWith(`${AGENT_NOT_REGISTERED} oracle: `)

// Bad — passes for any message that mentions the phrase
expect(logged[0]).toContain('could not register')
```

## Ask what a wrong implementation would get past

Coverage shows which lines ran, not whether the tests would notice a plausible mistake. Check for
mistakes directly. For the subagents:

- Removing `tools: []` from the Editor would give it every tool the parent has, including Edit and
  Bash. A test that checks only `model` and `effort` misses it.
- Moving the `try` outside the loop would let one refused agent cost the others. Only a test with
  a refused agent catches it.
- Reading the wrong prompt path would leave an agent without its instructions. The path-checking
  `fs.read` stand-in catches it.

To check a mistake, copy the plugin to a temporary folder, change one line there, and run
`claude plugin test` in that folder. A test should fail. Working in a copy leaves your checkout
untouched.

```sh
tmp=$(mktemp -d) && cp -r .claude-plugin hooks prompts "$tmp"
rm -rf "$tmp/.claude-plugin/types"
grep -v 'tools: \[\]' "$tmp/hooks/agents/editor.ts" > "$tmp/editor.ts"
mv "$tmp/editor.ts" "$tmp/hooks/agents/editor.ts"
claude plugin test "$tmp"                # Expect a failing test
```

If no test fails, decide whether the change alters the plugin's contract, and add a test if it does.
Do not pin incidental details only to catch every possible change.

## End-to-end checks

The tests do not show that the model delegates well, that the prompts produce good results, or
that Claude Code loads the module in a real session. Check those with the working copy. To check
a subagent, ask the main model to delegate to it by name:

```sh
claude -p --model sonnet --plugin-dir . "Delegate to the normal-swe:oracle agent with this brief: 'Without using any tools, reply with exactly the word PONG.' Then paste its answer verbatim."
```

Expect `PONG`. Replace `oracle` with `librarian`, `gardener`, or `editor` to check the others. To
check that the Editor revises a draft, give it one:

```sh
claude -p --model sonnet --plugin-dir . "Delegate to the normal-swe:editor agent with this brief: 'Revise this sentence for developers: It is important to note that the plugin serves as a robust foundation.' Then paste its answer verbatim."
```

Expect the revised text, followed by any notes after a `--- Editor notes ---` line. If an
agent cannot be registered, the transcript shows a line starting with
`normal-swe could not register the agent`, followed by the agent's name and the reason.

If a subagent is missing, add `--debug` and search the newest log in `~/.claude/debug/`
for these lines:

| Debug log line | Meaning |
| --- | --- |
| `Plugin "normal-swe" from --plugin-dir overrides installed version` | The working copy replaced the installed plugin. |
| `hooks module normal-swe@inline loaded (...); events: session.start` | Claude Code loaded the module. |
| `$.agent.register (normal-swe): normal-swe:oracle listed` | The module registered a subagent, one line for each. |
| `hooks modules not loaded: rollout flag (tengu_plugin_hooks_modules) is off` | This Claude Code version or account does not load hooks modules yet. |
| `<plugin>: <event> bypassed by cc-plugin-sec-default (tier user)` | An organization security policy skipped the hook. |

Hooks modules are an early-access feature behind a rollout flag. Without them, the plugin
loads only its skills: the subagents are registered by the hooks module. To check an older release, validate
the plugin manifest with that version:

```sh
bunx @anthropic-ai/claude-code@2.1.200 plugin validate .claude-plugin/plugin.json
```

Pass the manifest path, not `.`. Given a folder that contains `marketplace.json`, older versions
validate only the marketplace manifest.

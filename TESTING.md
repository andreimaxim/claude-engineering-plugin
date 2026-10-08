# Testing

This guide explains how to check changes to this plugin: which commands to run, how the tests
work, how to write new ones, and how to try the subagents and the Editor tool in a real session or
find out why they are missing.

The tests live next to the code they cover. [hooks/register.ts](hooks/register.ts) registers
the subagents and the Editor tool, and [hooks/register.test.ts](hooks/register.test.ts) tests
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
fails with `no implementation for <event>`. The Editor tool needs five answers, because the
module's `session.start` hook also registers the subagents and reads their prompts:

```ts
on('tool.register', ($, e) => ({ value: { tool: `mcp__normal-swe__${e.name}` } }))
on('agent.register', ($, e) => ({ value: { agent: `normal-swe:${e.name}` } }))
on('session.start', ($, e) => ({ cwd: e.cwd }))
on('fs.read', () => ({ value: 'PROMPT' }))
on('model.complete', () => ({ value: { isAnswered: true, text: 'Revised draft.', usage: USAGE } }))
```

Answers take one of two shapes:

- Operations the plugin calls on `$`, such as `$.tool.register`, `$.fs.read`, and
  `$.model.complete`, take `{ value }` or `{ deny }`. The engine skips any other answer and reports
  `returned neither { value } nor { deny }`.
- Events, such as `session.start`, take the event's own result, here `{ cwd }`.

The plugin loads at the test's first call on `$`, so register the test's hooks before that call.
The kit's `mock` covers only `$.clock`, `$.store`, and `$.env.get`. Answer every other call with
`on`.

When a test fails, the output lists each hook the engine skipped and why. Read that list first,
because a skipped stand-in usually explains the assertion failure that follows.

```text
HooksError: no implementation for tool.call

the engine reported:
  test's tool.register hook was skipped: test: returned neither { value } nor { deny }
  normal-swe's session.start hook was skipped: normal-swe: no implementation for tool.register
```

Each test has 5 seconds. To change that, pass `{ timeoutMs }` as the second argument to `test`.
A test can import from the module it tests, such as the exported `MISSING_TASK` message.

## Testing approach

Treat tests as executable specifications of what the plugin does at the engine boundary: what it
registers, what it sends to the model, and what it returns to the caller. Assert those outcomes,
not the steps the plugin takes to produce them. A refactoring that keeps the same requests and
replies should not require test changes.

Because the test answers every engine call, make each answer behave like the real engine. A
file-system stand-in that returns the prompt for any path would let a wrong path pass. Answer
only the real path, and assert on the outcome that depends on it:

```ts
// Good — a wrong path is refused, and the request to the model proves the right file was read
on('fs.read', ($, e) => {
  const name = PROMPT_PATH.exec(e.path)?.[1]
  return name ? { value: `${name.toUpperCase()} PROMPT` } : { deny: `No such file: ${e.path}` }
})

expect(requests[0]?.system).toBe('EDITOR PROMPT')

// Bad — records how the prompt is loaded instead of what reaches the model
on('fs.read', ($, e) => {
  reads.push(e.path)
  return { value: 'EDITOR PROMPT' }
})

expect(reads).toEqual([expect.stringMatching(/\/prompts\/editor\.md$/)])
```

Record calls to an operation only when the call itself is the behavior under test, as with the
request sent to `model.complete`.

## Test names state facts

Name each test as a fact about the tool, in words a plugin user would understand. Name the
behavior, not the code that exercises it, and include the condition when it distinguishes the case.

```ts
// Good — facts about the tool
test('the editor tool is offered to the model when a session starts', ...)
test('a request without draft text is refused before it reaches the model', ...)

// Bad — names code and calls
test('sends the task to Opus with the Editor prompt', ...)
test('refuses a blank task without calling the model', ...)
```

Read together, the names should describe the plugin's hooks module:

- The editor tool is offered to the model when a session starts.
- The four agents are offered with their own description, instructions, model, effort, and tools
  when a session starts.
- An agent that cannot be registered is reported without losing the editor tool or the other
  agents.
- A draft is revised with the Editor instructions by Opus at low effort.
- A model failure is reported to the caller.
- A request without draft text is refused before it reaches the model.
- The transcript row of an editor call is one dim line that names what Editor is doing, never
  the draft.
- The revised text is not drawn under the editor's transcript row, but a failure's reason is.
- The transcript rows of another tool's call are drawn as the engine has them.

Give a behavior its own test when it is part of the tool's contract or can break independently.
Registration is an example, because the tool name the model sees can change without affecting a
revision. Do not add a test for a fact that another test already proves.

## Use whitespace to show structure

Separate arrange, act, and assert with blank lines. In these tests, the engine stand-ins are the
arrangement, and starting the session and calling the tool are the act:

```ts
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
```

## Keep expectations separate and visible

Assert each expectation separately, so a failure names what broke. Assert the number of calls
separately from their contents:

```ts
// Good — the count and each field fail on their own
expect(requests).toHaveLength(1)
expect(requests[0]?.model).toBe('opus')
expect(requests[0]?.maxTokens).toBe(32000)

// Bad — one failure for any difference, and maxTokens is not checked at all
expect(requests).toEqual([expect.objectContaining({ model: 'opus', effort: 'low' })])
```

Write each test's stand-ins and assertions in the test rather than in shared helpers. Small
shared constants such as `TOOL`, `PROMPT_PATH`, and `USAGE` are fine.

Compare long messages to the constant the module exports, rather than copying the text or
checking a fragment:

```ts
// Good
expect(reply.deny).toBe(MISSING_TASK)

// Bad — passes for any message that mentions the phrase
expect(reply.deny).toContain('full draft text')
```

## Ask what a wrong implementation would get past

Coverage shows which lines ran, not whether the tests would notice a plausible mistake. Check for
mistakes directly. For the Editor tool:

- Removing `maxTokens: 32000` would cut long drafts off at the 1024-token default. A test that
  checks only `model` and `effort` misses it.
- Returning `{ result }` when the model call fails would hide the failure from the caller. Only a
  test with a failed model call catches it.
- Reading the wrong prompt path would break every call. The path-checking `fs.read` stand-in
  catches it.

To check a mistake, copy the plugin to a temporary folder, change one line there, and run
`claude plugin test` in that folder. A test should fail. Working in a copy leaves your checkout
untouched.

```sh
tmp=$(mktemp -d) && cp -r .claude-plugin hooks prompts "$tmp"
rm -rf "$tmp/.claude-plugin/types"
grep -v maxTokens "$tmp/hooks/tools/editor.ts" > "$tmp/editor.ts"
mv "$tmp/editor.ts" "$tmp/hooks/tools/editor.ts"
claude plugin test "$tmp"                # Expect a failing test
```

If no test fails, decide whether the change alters the tool's contract, and add a test if it does.
Do not pin incidental details only to catch every possible change.

## End-to-end checks

The tests do not show that the model uses the tool well, that the Editor prompt produces good
edits, or that Claude Code loads the module in a real session. Check those with the working copy:

```sh
claude -p --model sonnet --plugin-dir . "Use the editor tool to revise this sentence for developers and paste its output verbatim: 'It is important to note that the plugin serves as a robust foundation.'"
```

Expect the revised text, followed by any notes after a `--- Editor notes ---` line. In an
interactive session, the call appears in the transcript as one dim line, `Asking the Editor to
revise a draft…` while it runs and `Asked the Editor to revise a draft.` once it has, with nothing
drawn under it. A failed call reads `The Editor could not revise the draft.` with the error drawn
under it as for any tool. The module's `ui.render` hooks draw those rows alone; the model still
receives the task and the revision, and the transcript stores both whole.

To check a subagent, ask the main model to delegate to it by name:

```sh
claude -p --model sonnet --plugin-dir . "Delegate to the normal-swe:oracle agent with this brief: 'Without using any tools, reply with exactly the word PONG.' Then paste its answer verbatim."
```

Expect `PONG`. Replace `oracle` with `librarian` or `gardener` to check the others. If an
agent cannot be registered, the transcript shows a line starting with
`normal-swe could not register the agent`, followed by the agent's name and the reason.

If the tool is missing or fails, add `--debug` and search the newest log in `~/.claude/debug/`
for these lines:

| Debug log line | Meaning |
| --- | --- |
| `Plugin "normal-swe" from --plugin-dir overrides installed version` | The working copy replaced the installed plugin. |
| `hooks module normal-swe@inline loaded (...); events: session.start,tool.call,ui.render` | Claude Code loaded the module. |
| `$.agent.register (normal-swe): normal-swe:oracle listed` | The module registered a subagent, one line for each. |
| `hooks module normal-swe@inline tool.call settled in <n>ms` | The tool ran. `<n>` includes the model call. |
| `hooks modules not loaded: rollout flag (tengu_plugin_hooks_modules) is off` | This Claude Code version or account does not load hooks modules yet. |
| `<plugin>: <event> bypassed by cc-plugin-sec-default (tier user)` | An organization security policy skipped the hook. |

Hooks modules are an early-access feature behind a rollout flag. Without them, the plugin
loads only its skills: the subagents and the Editor tool are registered by the hooks module. To check an older release, validate
the plugin manifest with that version:

```sh
bunx @anthropic-ai/claude-code@2.1.200 plugin validate .claude-plugin/plugin.json
```

Pass the manifest path, not `.`. Given a folder that contains `marketplace.json`, older versions
validate only the marketplace manifest.

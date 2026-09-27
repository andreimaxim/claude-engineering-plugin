# frozen_string_literal: true

module EngineeringEvals
  module Hosts
    # Claude Code adapter. Built from the official CLI reference (code.claude.com/docs,
    # September 2026) and the stream-json shape shared with Amp. It has NOT been run
    # against real Claude Code output: no subscription login was available where it
    # was written. Batches from it are marked unexercised until someone replays one.
    module ClaudeCode
      DEFAULT_TOOLS = %w[Bash Edit Glob Grep Read Write].freeze

      module_function

      def name = "claude-code"
      def adapter = "unexercised"
      def default_tools = DEFAULT_TOOLS
      def expected_tools(requested) = requested.fetch("tools")

      def preflight
        unless ENV["CLAUDE_CODE_OAUTH_TOKEN"]
          raise Error, "Claude Code replay uses a subscription token so each run can have an isolated config " \
                       "directory. Run `claude setup-token`, then export CLAUDE_CODE_OAUTH_TOKEN. API keys are " \
                       "deliberately not forwarded."
        end
        return if (Subprocess.run(%w[claude --version]).success? rescue false)

        raise Error, "The claude CLI is not available on PATH."
      end

      def prepare(_context) = nil

      def environment(context)
        Hosts.isolated_environment(context.home_dir, {
          "CLAUDE_CODE_OAUTH_TOKEN" => ENV["CLAUDE_CODE_OAUTH_TOKEN"],
          "CLAUDE_CONFIG_DIR" => File.join(context.home_dir, ".claude"),
          **context.runtime_env,
        })
      end

      def launch(context)
        requested = context.requested
        argv = ["claude", "-p", context.prompt, "--output-format", "stream-json", "--verbose",
                # Keeps the default system prompt but skips CLAUDE.md, skills, plugins,
                # hooks, MCP servers, and memory; the isolated config dir drops user settings.
                "--safe-mode", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
                "--tools", requested.fetch("tools").join(","), "--permission-mode", "bypassPermissions"]
        argv += ["--model", requested["model"]] if requested["model"]
        argv += ["--effort", requested["effort"]] if requested["effort"]
        [argv, environment(context)]
      end

      def observe(context, trace)
        version = (Subprocess.run(%w[claude --version], env: environment(context), exact_env: true) rescue nil)
        usage = trace.result&.dig("usage")
        usage = nil unless usage.is_a?(Hash)
        models = ([trace.init&.dig("model")] + Array(trace.result&.dig("modelUsage")&.keys)).compact.uniq.sort
        named = lambda do |value, kind|
          Array(value).map { "#{kind}: #{_1.is_a?(Hash) ? _1["name"] : _1}" }
        end
        Observation.new(
          host_version: version&.success? ? version.stdout.strip : nil,
          session_id: trace.session_id, models:,
          # The requested --effort is recorded in the batch; the stream does not echo it.
          effort: nil, mode: nil, tools: trace.tools,
          input_tokens: usage && %w[input_tokens cache_creation_input_tokens cache_read_input_tokens].sum { usage[_1] || 0 },
          output_tokens: usage&.dig("output_tokens"),
          mcp_servers: trace.mcp_servers,
          host_guidance: named.call(trace.init&.dig("skills"), "skill") + named.call(trace.init&.dig("plugins"), "plugin"),
          response: trace.response,
          error: trace.succeeded? ? nil : "host reported #{trace.result&.dig("subtype") || "no result event"}",
        )
      end
    end
  end
end

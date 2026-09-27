# frozen_string_literal: true

module EngineeringEvals
  module Hosts
    # Amp in execute mode with stream JSON, run locally with a private thread.
    module Amp
      # Amp's visible shell tools dispatch internally as async_* tools. Enabling only
      # the visible names makes every shell call fail with "is disabled: settings"
      # (observed in the pilot), so the allowlist carries both spellings.
      PUBLIC_TOOLS = %w[apply_patch shell_command shell_command_kill shell_command_status].freeze
      INTERNAL_ALIASES = %w[async_shell_command async_shell_command_kill async_shell_command_status].freeze

      module_function

      def name = "amp"
      def adapter = "exercised"
      def default_tools = PUBLIC_TOOLS
      def expected_tools(requested) = requested.fetch("tools")

      def preflight
        raise Error, "Amp runs need AMP_API_KEY (an Amp access token) in the environment." unless ENV["AMP_API_KEY"]
        return if (Subprocess.run(%w[amp --version]).success? rescue false)

        raise Error, "The amp CLI is not available on PATH."
      end

      def settings_file(context) = File.join(context.run_dir, "amp-settings.json")

      def prepare(context)
        JsonFile.write(settings_file(context), {
          "amp.tools.enable" => context.requested.fetch("tools") + INTERNAL_ALIASES,
          "amp.skills.disableClaudeCodeSkills" => true,
          "amp.skills.disableGlobalAgentsSkills" => true,
          "amp.mcpServers" => {},
          "amp.updates.mode" => "disabled",
          "amp.notifications.enabled" => false,
        })
      end

      def environment(context)
        Hosts.isolated_environment(context.home_dir, {
          "AMP_API_KEY" => ENV["AMP_API_KEY"], "AMP_URL" => ENV["AMP_URL"], **context.runtime_env
        })
      end

      def launch(context)
        argv = ["amp", "--settings-file", settings_file(context), "--executor", "local", "--visibility", "private",
                "--no-ide", "--no-notifications", "--stream-json"]
        argv += ["--mode", context.requested["mode"]] if context.requested["mode"]
        [argv + ["-x", context.prompt], environment(context)]
      end

      def observe(context, trace)
        env = environment(context)
        version = Subprocess.run(%w[amp --version], env:, exact_env: true)
        models = []
        input_tokens = output_tokens = nil
        mode = trace.init&.dig("agent_mode")
        export_error = nil
        if (session = trace.session_id)
          exported = Subprocess.run(["amp", "--settings-file", settings_file(context), "threads", "export", session],
                                    env:, exact_env: true)
          if exported.success?
            File.write(File.join(context.run_dir, "thread.json"), exported.stdout)
            thread = JSON.parse(exported.stdout)
            usages = Array(thread["messages"]).filter_map { _1["usage"] if _1.is_a?(Hash) && _1["usage"].is_a?(Hash) }
            models = usages.filter_map { _1["model"] }.uniq.sort
            input_tokens = usages.sum { _1["totalInputTokens"] || 0 }
            output_tokens = usages.sum { _1["outputTokens"] || 0 }
            mode = thread["agentMode"] || mode
          else
            export_error = "thread export failed: #{exported.stderr.strip[0, 300]}"
          end
        end
        Observation.new(
          host_version: version.success? ? version.stdout.strip.split(" ").first : nil,
          session_id: session, models:,
          # Amp exposes the mode dial, not the underlying reasoning effort.
          effort: nil, mode:, tools: trace.tools, input_tokens:, output_tokens:,
          mcp_servers: trace.mcp_servers, host_guidance: synced_guidance(context.home_dir),
          response: trace.response,
          error: trace.succeeded? ? export_error : "host reported #{trace.result&.dig("subtype") || "no result event"}",
        )
      end

      # Names of skills and plugins Amp synced from the account into the isolated cache.
      def synced_guidance(home_dir)
        { "skill" => "global-skills", "plugin" => "global-plugins" }.flat_map do |kind, dir|
          root = File.join(home_dir, ".cache", "amp", dir)
          Dir.glob("*/*/*", base: root).select { File.directory?(File.join(root, _1)) }
             .map { "#{kind}: #{File.basename(_1).sub(/@\h+\z/, "")}" }
        end.sort
      end
    end
  end
end

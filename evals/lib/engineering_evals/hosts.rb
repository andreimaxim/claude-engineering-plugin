# frozen_string_literal: true

module EngineeringEvals
  # Agent hosts. Each prepares an isolated home, builds the launch command with an
  # exact environment, and reads what it observed from the stream and host exports.
  module Hosts
    # Everything a host needs for one run. `runtime_env` is identical in both conditions.
    Context = Data.define(:run_dir, :work_dir, :home_dir, :prompt, :requested, :runtime_env)

    Observation = Data.define(:host_version, :session_id, :models, :effort, :mode, :tools, :input_tokens,
                              :output_tokens, :mcp_servers, :host_guidance, :response, :error)

    module_function

    def for(name)
      case name
      when "amp" then Amp
      when "claude-code" then ClaudeCode
      else raise Error, "Unknown host #{name}"
      end
    end

    # Only PATH and locale from the operator's shell; a fresh HOME and XDG tree.
    def isolated_environment(home_dir, extra)
      {
        "PATH" => ENV.fetch("PATH"),
        "LANG" => "C.UTF-8",
        "HOME" => home_dir,
        "XDG_CONFIG_HOME" => File.join(home_dir, ".config"),
        "XDG_CACHE_HOME" => File.join(home_dir, ".cache"),
        "XDG_DATA_HOME" => File.join(home_dir, ".local", "share"),
        "XDG_STATE_HOME" => File.join(home_dir, ".local", "state"),
      }.merge(extra.compact)
    end
  end
end

require_relative "hosts/amp"
require_relative "hosts/claude_code"

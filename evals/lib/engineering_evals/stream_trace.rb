# frozen_string_literal: true

module EngineeringEvals
  # Parser for Claude Code's `--output-format stream-json`, which Amp's
  # `--stream-json` also emits. Only fields observed in real Amp output (and
  # documented for Claude Code) are read; the raw transcript stays private.
  class StreamTrace
    ToolUse = Struct.new(:id, :name, :input, :error, :result_text, keyword_init: true)

    ALLOWED_PREFIXES = %w[/usr/ /bin/ /etc/ /dev/ /proc/ /lib/ /lib64/ /opt/ /tmp/ /var/lib/].freeze

    attr_reader :init, :result, :tool_uses, :last_assistant_text, :malformed_lines

    def self.read(path) = new(File.exist?(path) ? File.read(path) : "")

    def initialize(text)
      @init = @result = nil
      @tool_uses = []
      @last_assistant_text = ""
      @malformed_lines = 0
      by_id = {}
      text.each_line do |line|
        next if line.strip.empty?

        event = begin
          JSON.parse(line)
        rescue JSON::ParserError
          @malformed_lines += 1
          next
        end
        next (@malformed_lines += 1) unless event.is_a?(Hash)

        consume(event, by_id)
      end
    end

    def session_id = init&.dig("session_id") || result&.dig("session_id")
    def tools = Array(init&.dig("tools")).sort
    def succeeded? = result&.dig("subtype") == "success" && result["is_error"] == false

    def mcp_servers
      Array(init&.dig("mcp_servers")).map { "#{_1["name"]} (#{_1["status"] || "unknown"})" }
    end

    def response = result&.dig("result") || (last_assistant_text.empty? ? nil : last_assistant_text)

    # Whether any tool call referred to the supplied skill file.
    def reads_supplied_skill? = tool_uses.any? { input_text(_1.input).include?("reference/SKILL.md") }

    def disabled_tool_errors = tool_uses.count { _1.error && _1.result_text.match?(/is disabled/) }

    # Short, reviewable descriptions of tool calls with observed results.
    # Workspace roots: where the harness prepared it and where the host reported
    # running (they differ when a batch directory has been moved).
    def workspace_roots(work_dir) = [work_dir, init&.dig("cwd")].grep(String).uniq

    def actions(work_dir)
      roots = workspace_roots(work_dir)
      relative = ->(value) { roots.reduce(value) { |text, root| text.gsub("#{root}/", "").gsub(root, ".") } }
      tool_uses.map do |use|
        summary = relative.call(summarize_input(use.input))
        summary = "#{summary[0, 400]}…" if summary.length > 400
        { "tool" => use.name, "summary" => summary, "error" => use.error,
          "result" => summarize_result(use.result_text)&.then { relative.call(_1) } }
      end
    end

    # Heuristic: absolute paths outside the workspace and ordinary system locations,
    # or parent-directory references, in commands and file targets (not contents).
    def outside_access(work_dir, allowed = [])
      found = []
      roots = workspace_roots(work_dir)
      tool_uses.each do |use|
        text = path_bearing_text(use.input)
        text.scan(%r{(?<![\w.])/(?:[\w.@+-]+/?)+}) do |path|
          next if path == "/" || roots.any? { path.start_with?(_1) }
          next if (ALLOWED_PREFIXES + allowed).any? { path.start_with?(_1) }

          found << "#{use.name}: #{path}"
        end
        found << "#{use.name}: parent-directory reference" if text.match?(/(^|[\s'"=;&|(])\.\.(\/|\s|$|["';&|)])/)
      end
      found.uniq.first(50)
    end

    private

    def consume(event, by_id)
      @init = event if event["type"] == "system" && event["subtype"] == "init"
      @result = event if event["type"] == "result"
      content = event.dig("message", "content")
      return unless content.is_a?(Array)

      blocks = content.grep(Hash)
      case event["type"]
      when "assistant"
        texts = blocks.select { _1["type"] == "text" && _1["text"].to_s != "" }.map { _1["text"] }
        @last_assistant_text = texts.join("\n") unless texts.empty?
        blocks.select { _1["type"] == "tool_use" }.each do |block|
          use = ToolUse.new(id: block["id"], name: block["name"] || "unknown", input: block["input"], error: false, result_text: "")
          @tool_uses << use
          by_id[block["id"]] = use if block["id"]
        end
      when "user"
        blocks.select { _1["type"] == "tool_result" }.each do |block|
          use = by_id[block["tool_use_id"]] or next
          use.error = block["is_error"] == true
          use.result_text = block["content"].is_a?(String) ? block["content"] : JSON.generate(block["content"] || "")
        end
      end
    end

    def input_text(input) = input.is_a?(String) ? input : JSON.generate(input || {})

    def patch_text(fields)
      [fields["patchText"], fields["patch"]].find { _1.is_a?(String) }
    end

    def summarize_input(input)
      fields = input.is_a?(Hash) ? input : {}
      if fields["command"].is_a?(String) then fields["command"]
      elsif (patch = patch_text(fields))
        files = patch.scan(/^\*\*\* (Add|Update|Delete) File: (.+)$/).map { "#{_1.downcase} #{_2}" }
        files.empty? ? "patch" : files.join(", ")
      elsif fields["file_path"].is_a?(String) then fields["file_path"]
      elsif fields["pattern"].is_a?(String) then "pattern #{fields["pattern"]}"
      else input_text(input)
      end
    end

    # The parts of a tool input that name paths: commands and file targets.
    def path_bearing_text(input)
      fields = input.is_a?(Hash) ? input : {}
      if (patch = patch_text(fields))
        return patch.scan(/^\*\*\* (?:Add|Update|Delete|Move to) File: (.+)$/).flatten.join("\n")
      end

      named = %w[command workdir file_path path cwd].map { fields[_1] }.grep(String)
      named.empty? ? input_text(input) : named.join("\n")
    end

    # Exit status and output tail, e.g. from Amp's {"output","exitCode"} results.
    def summarize_result(text)
      return nil if text.nil? || text.empty?

      tail = ->(value, length) { value.length > length ? "…#{value[-length..]}" : value }
      parsed = JSON.parse(text) rescue nil
      if parsed.is_a?(Hash) && (parsed["exitCode"].is_a?(Integer) || parsed["output"].is_a?(String))
        output = parsed["output"].is_a?(String) ? tail.call(parsed["output"].strip, 600) : ""
        return "exit #{parsed["exitCode"] || "?"}#{output.empty? ? "" : "\n#{output}"}"
      end
      return parsed["summary"] if parsed.is_a?(Hash) && parsed["summary"].is_a?(String)

      tail.call(text.strip, 600)
    end
  end
end

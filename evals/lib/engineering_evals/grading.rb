# frozen_string_literal: true

module EngineeringEvals
  # Model-assisted rubric grading of finished runs in a fresh, isolated Amp session.
  # The rubric never enters an agent workspace; the grader sees the shared prompt
  # without the skill line and a trace with supplied-reference reads removed.
  class Grading
    VERDICTS = %w[pass fail unverified].freeze

    METHOD = "Model-assisted rubric grading in a fresh isolated Amp session. The grader saw the shared task prompt " \
             "(without the skill instruction), pristine inputs, the final response, the workspace diff, " \
             "harness-executed checks, and the observed tool trace (commands with exit status and output tails) " \
             "with supplied-reference reads removed. It did not see the condition label, run identity, timing, or " \
             "tokens. The response itself may still reveal the condition."

    PROMPT = <<~PROMPT.strip
      You are grading one agent's work. Read TASK.md. The agent's final response is evidence/response.md,
      its workspace changes are evidence/changes.diff, checks executed by the evaluation harness after the agent finished are
      in evidence/checks.md, and the observed tool trace is evidence/actions.md. The agent's original inputs are under
      inputs/ (unchanged). Verify substantive claims against inputs and executed evidence; distinguish what the agent claimed
      from what was observed.

      For every criterion in TASK.md, decide pass, fail, or unverified (evidence insufficient either way). Cite decisive
      evidence: a short quote, file:line, check id, or action. Then write grade.json in this directory:

      {"criteria":[{"id":"<criterion id>","verdict":"pass|fail|unverified","evidence":"..."}],"note":"one or two sentences"}

      Do not modify inputs/ or evidence/. Work only in this directory. Do not launch another agent, push, or publish.
    PROMPT

    def initialize(batch) = @batch = batch

    def grade(mode:, force:, only: nil)
      Hosts::Amp.preflight
      @batch.runs.each do |planned|
        next if only && planned["id"] != only

        record = @batch.record(planned["id"])
        unless record["state"] == "finished" && record.dig("outcome", "execution") == "succeeded"
          puts "skip       #{planned["id"]}: not a successful finished run"
          next
        end
        next if record["grade"] && !force

        grade_run(record, @batch.snapshot_for(planned), mode)
      end
    end

    private

    def grade_run(record, definition, mode)
      run_id = record.dig("run", "id")
      dir = File.join(Paths.run_dir(@batch.id, run_id), "grading")
      prepare(record, definition, dir)
      context = Hosts::Context.new(run_dir: dir, work_dir: File.join(dir, "work"), home_dir: File.join(dir, "home"),
                                   prompt: PROMPT, runtime_env: {},
                                   requested: { "host" => "amp", "mode" => mode, "model" => nil, "effort" => nil,
                                                "tools" => Hosts::Amp::PUBLIC_TOOLS })
      Hosts::Amp.prepare(context)
      argv, env = Hosts::Amp.launch(context)
      puts "grade      #{run_id}"
      Subprocess.run(argv, env:, exact_env: true, chdir: context.work_dir, timeout: Execution::AGENT_TIMEOUT,
                           stdout: File.join(dir, "transcript.jsonl"), stderr: File.join(dir, "stderr.txt"))
      observation = Hosts::Amp.observe(context, StreamTrace.read(File.join(dir, "transcript.jsonl")))
      output = File.join(context.work_dir, "grade.json")
      return puts("failed     #{run_id}: grader wrote no grade.json (#{observation.error || "no error reported"})") unless File.exist?(output)

      verdicts = parse(output, definition)
      return puts("failed     #{run_id}: grade.json does not cover every criterion") unless verdicts

      record["grade"] = {
        "grader" => "Amp #{observation.host_version || "unknown version"}, mode #{observation.mode || mode}, " \
                    "model #{observation.models.empty? ? "unknown" : observation.models.join(", ")}",
        "method" => METHOD, "criteria" => verdicts[:criteria], "note" => verdicts[:note],
      }
      @batch.save(record)
      failures = verdicts[:criteria].reject { _1["verdict"] == "pass" }.map { "#{_1["id"]}=#{_1["verdict"]}" }
      puts "graded     #{run_id}: #{failures.empty? ? "all pass" : failures.join(", ")}"
    end

    def parse(path, definition)
      data = JSON.parse(File.read(path)) rescue nil
      return nil unless data.is_a?(Hash) && data["note"].is_a?(String) && data["criteria"].is_a?(Array)

      criteria = definition.criteria.map do |criterion|
        verdict = data["criteria"].find { _1.is_a?(Hash) && _1["id"] == criterion["id"] }
        return nil unless verdict && VERDICTS.include?(verdict["verdict"]) && verdict["evidence"].is_a?(String)

        verdict.slice("id", "verdict", "evidence")
      end
      { criteria:, note: data["note"] }
    end

    def prepare(record, definition, dir)
      run_dir = Paths.run_dir(@batch.id, record.dig("run", "id"))
      work = File.join(dir, "work")
      FileUtils.rm_rf(dir)
      FileUtils.mkdir_p([File.join(work, "evidence"), File.join(work, "inputs"), File.join(dir, "home")])
      File.write(File.join(work, "TASK.md"), task_document(definition))
      FileUtils.cp(File.join(run_dir, "response.md"), File.join(work, "evidence", "response.md"))
      FileUtils.cp(File.join(run_dir, "changes.diff"), File.join(work, "evidence", "changes.diff"))
      File.write(File.join(work, "evidence", "checks.md"), checks_document(record))
      File.write(File.join(work, "evidence", "actions.md"), actions_document(JsonFile.read(File.join(run_dir, "actions.json"))))
      if definition.repository?
        repo = File.join(work, "inputs", definition.input["repository"])
        Subprocess.run!(["git", "init", "--quiet", repo])
        Subprocess.run!(["git", "-C", repo, "fetch", "--quiet", "--depth", "1", File.join(run_dir, "work"), record["baseCommit"] || "HEAD"])
        Subprocess.run!(["git", "-C", repo, "checkout", "--quiet", "--detach", "FETCH_HEAD"])
      else
        definition.input["files"].each { FileUtils.cp(File.join(definition.dir, _1), File.join(work, "inputs", File.basename(_1))) }
      end
    end

    def task_document(definition)
      criteria = definition.criteria.map { "- `#{_1["id"]}` (#{_1["kind"]}): #{_1["text"]}" }.join("\n")
      <<~MARKDOWN
        # Grading task

        ## Task given to the agent

        #{definition.prompt}

        ## Expected outcome

        #{definition.expected}

        ## Criteria

        #{criteria}

        Criterion kinds: `task` criteria follow from the prompt or correctness; `process` criteria are extra expectations
        the prompt did not request. Grade each independently.
      MARKDOWN
    end

    def checks_document(record)
      checks = Array(record["checks"]).map do |c|
        "## #{c["id"]}: #{c["passed"] ? "passed" : "FAILED"} (exit #{c["exitCode"]})\n\n#{c["description"]}\n\n" \
          "`#{c["command"].join(" ")}`\n\n```\n#{c["output"].to_s[-4000..] || c["output"]}\n```"
      end
      checks.empty? ? "No harness checks are defined for this case.\n" : checks.join("\n\n")
    end

    # Mask the condition: drop reads of the supplied reference and redact result
    # lines naming it.
    def actions_document(actions)
      visible = actions.reject { _1["summary"].include?("reference/") }
      lines = visible.each_with_index.map do |action, index|
        result = action["result"]&.gsub(/^.*\breference\b.*$/, "[line naming the supplied reference omitted]")
        line = "#{index + 1}. #{action["tool"]}#{action["error"] ? " (error)" : ""}: #{action["summary"]}"
        result ? "#{line}\n   Observed result:\n#{result.gsub(/^/, "     ")}" : line
      end
      lines.empty? ? "No tool calls.\n" : lines.join("\n")
    end
  end
end

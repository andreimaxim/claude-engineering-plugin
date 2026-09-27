# frozen_string_literal: true

module EngineeringEvals
  # Executes prepared runs and derives evidence. A run is persisted as `launched`
  # before its agent starts, so an interrupted harness leaves it uncertain rather
  # than silently relaunching it.
  class Execution
    AGENT_TIMEOUT = 60 * 60
    CHECK_TIMEOUT = 15 * 60

    def initialize(batch) = @batch = batch

    def run_all(jobs:)
      host = @batch.host
      host.preflight
      records = @batch.records
      records.select { _1["state"] == "launched" }.each do |record|
        puts "uncertain  #{record.dig("run", "id")}: launched at #{record["launchedAt"]} with no recorded exit; not relaunching."
      end
      pending = Queue.new
      records.select { _1["state"] == "prepared" }.each { pending << _1 }
      workers = [jobs, pending.size].min
      puts "#{pending.size} prepared run(s); running #{workers} at a time."
      pending.close
      Array.new(workers) do
        Thread.new do
          while (record = pending.pop)
            execute(record)
          end
        end
      end.each(&:join)
    end

    # Re-derive evidence from preserved transcripts and workspaces; never relaunches.
    def recollect
      @batch.records.each do |record|
        next unless record["state"] == "finished" && record.dig("outcome", "execution") != "launch-failed"

        collect(record, @batch.context(record), seconds: record.dig("observed", "seconds"), launch_error: nil,
                                                 host_version: record.dig("observed", "hostVersion"))
        @batch.save(record)
        puts "recollected #{record.dig("run", "id")}: #{record.dig("outcome", "execution")}, checks #{record.dig("outcome", "checks")}"
      end
    end

    # Explicit operator decision to discard an attempt: archive it and prepare afresh.
    def reset(run_id, reason)
      planned = @batch.run(run_id)
      previous = @batch.record(run_id)
      dir = Paths.run_dir(@batch.id, run_id)
      archived = "#{dir}.attempt-#{previous.fetch("resets", []).length + 1}"
      File.rename(dir, archived)
      fresh = @batch.prepare_run(planned)
      fresh["resets"] = previous.fetch("resets", []) + [{ "at" => JsonFile.timestamp, "reason" => reason, "archivedAs" => archived }]
      @batch.save(fresh)
    end

    private

    def execute(record)
      context = @batch.context(record)
      record["state"] = "launched"
      record["launchedAt"] = JsonFile.timestamp
      @batch.save(record)
      puts "launch     #{record.dig("run", "id")}"

      argv, env = @batch.host.launch(context)
      seconds = launch_error = nil
      begin
        result = Subprocess.run(argv, env:, exact_env: true, chdir: context.work_dir, timeout: AGENT_TIMEOUT,
                                      stdout: File.join(context.run_dir, "transcript.jsonl"),
                                      stderr: File.join(context.run_dir, "stderr.txt"))
        record["exitCode"] = result.exit_code
        seconds = result.seconds
        launch_error = "timed out after #{AGENT_TIMEOUT} s" if result.timed_out
        launch_error ||= "terminated by signal #{result.status.termsig}" if result.status&.signaled?
      rescue SystemCallError => e
        record["exitCode"] = nil
        launch_error = e.message
      end
      collect(record, context, seconds:, launch_error:)
      record["state"] = "finished"
      record["finishedAt"] = JsonFile.timestamp
      @batch.save(record)
      puts "finished   #{record.dig("run", "id")}: #{record.dig("outcome", "execution")}, checks #{record.dig("outcome", "checks")}"
    rescue StandardError => e
      # The launch is already recorded; leave the run uncertain for an operator.
      warn "error      #{record.dig("run", "id")}: #{e.class}: #{e.message}"
    end

    def collect(record, context, seconds:, launch_error:, host_version: nil)
      host = @batch.host
      trace = StreamTrace.read(File.join(context.run_dir, "transcript.jsonl"))
      observation = observe_error = nil
      unless launch_error
        begin
          observation = host.observe(context, trace)
        rescue StandardError => e
          observe_error = e.message
        end
      end
      diff, paths = workspace_changes(context.work_dir, record["baseCommit"] || "HEAD")
      File.write(File.join(context.run_dir, "changes.diff"), diff)
      response = observation&.response
      File.write(File.join(context.run_dir, "response.md"), response.to_s)
      JsonFile.write(File.join(context.run_dir, "actions.json"), trace.actions(context.work_dir))
      checks = launch_error ? [] : run_checks(record, context)
      skill_intact = record["skillFiles"] && (JsonFile.hash_tree(File.join(context.work_dir, "reference")) == record["skillFiles"])

      condition = record.dig("run", "condition")
      observed = {
        "hostVersion" => host_version || observation&.host_version,
        "sessionId" => observation&.session_id,
        "models" => observation&.models || [],
        "effort" => observation&.effort,
        "mode" => observation&.mode,
        "tools" => observation&.tools || [],
        "seconds" => seconds,
        "inputTokens" => observation&.input_tokens,
        "outputTokens" => observation&.output_tokens,
        "skillRead" => condition == "with-skill" ? trace.reads_supplied_skill? : nil,
        "outsideAccess" => trace.outside_access(context.work_dir, [Paths.toolchains_dir]),
        "disabledToolErrors" => trace.disabled_tool_errors,
        "mcpServers" => observation&.mcp_servers || [],
        "hostGuidance" => observation&.host_guidance || [],
        "workspaceGuidance" => record.dig("observedAtPreparation", "workspaceGuidance") || [],
      }
      record.merge!("observed" => observed,
                    "outcome" => outcome(record, trace, observed, observation, observe_error, launch_error, response, checks, skill_intact),
                    "checks" => checks, "changedPaths" => paths)
    end

    def outcome(record, trace, observed, observation, observe_error, launch_error, response, checks, skill_intact)
      requested_model = @batch.requested["model"]
      models = observed["models"]
      model = if models.empty? || !requested_model then "unknown"
              elsif models == [requested_model] then "match"
              else "mismatch"
              end
      expected_tools = @batch.host.expected_tools(@batch.requested)
      tools = if !trace.init then "unknown"
              elsif observed["tools"].sort == expected_tools.sort && observed["disabledToolErrors"].zero? then "match"
              else "mismatch"
              end
      missing = []
      missing << "no host initialization event" unless trace.init
      missing << "no final response" unless response
      missing << "no observed model identity" if models.empty?
      if record.dig("run", "condition") == "with-skill" && !observed["skillRead"]
        missing << "supplied skill read not observed in the trace"
      end
      missing << "#{trace.malformed_lines} malformed transcript line(s)" if trace.malformed_lines.positive?
      failed = observation&.error || observe_error || record["exitCode"] != 0
      {
        "execution" => launch_error ? "launch-failed" : (failed ? "host-error" : "succeeded"),
        "detail" => launch_error || observe_error || observation&.error || (record["exitCode"] == 0 ? nil : "exit code #{record["exitCode"]}"),
        "model" => model, "tools" => tools, "skillIntact" => skill_intact,
        "missingEvidence" => missing,
        "checks" => if launch_error then "not-run"
                    elsif checks.empty? then "none"
                    elsif checks.all? { _1["passed"] } then "passed"
                    else "failed"
                    end,
      }
    end

    # Diff against the input commit through a throwaway index, capturing untracked
    # files without touching the agent's own index.
    def workspace_changes(work_dir, base)
      index = File.join(File.dirname(work_dir), "evaluation.index")
      env = { "GIT_INDEX_FILE" => index }
      Subprocess.run!(["git", "-C", work_dir, "read-tree", base], env:)
      Subprocess.run!(["git", "-C", work_dir, "add", "--all"], env:)
      diff = Subprocess.run(["git", "-C", work_dir, "diff", "--cached", "--binary", base], env:).stdout
      names = Subprocess.run!(["git", "-C", work_dir, "diff", "--cached", "--name-only", base], env:)
      [diff, names.empty? ? [] : names.split("\n")]
    ensure
      FileUtils.rm_f(index)
    end

    def run_checks(record, context)
      definition = @batch.snapshot_for(record["run"])
      definition.checks.map do |check|
        started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        case check["kind"]
        when "file-equals" then compare_file(check, definition, context, started)
        when "repository-test" then repository_test(check, definition, context)
        end
      end
    end

    def compare_file(check, definition, context, started)
      actual_path = File.join(context.work_dir, check["path"])
      actual = File.exist?(actual_path) ? File.binread(actual_path) : nil
      passed = !actual.nil? && actual == File.binread(File.join(definition.dir, check["expected"]))
      output = if actual.nil? then "#{check["path"]} is missing"
               elsif passed then "identical"
               else "#{check["path"]} differs from the expected bytes"
               end
      { "id" => check["id"], "description" => check["description"],
        "command" => ["compare", check["path"], "{case}/#{check["expected"]}"], "exitCode" => passed ? 0 : 1,
        "passed" => passed, "seconds" => Process.clock_gettime(Process::CLOCK_MONOTONIC) - started, "output" => output }
    end

    # Runs in the checkout with a Bundler-free environment plus the target runtime's
    # variables, so the harness never leaks into the Rails bundle.
    def repository_test(check, definition, context)
      raise Error, "#{check["id"]}: repository-test needs a repository case" unless definition.repository?

      repository = Repository.load(definition.input["repository"])
      argv = repository.test_command + [check["path"].sub("{case}", definition.dir)]
      result = Subprocess.run(argv, env: context.runtime_env, chdir: context.work_dir, timeout: CHECK_TIMEOUT)
      output = result.stdout + (result.stderr.empty? ? "" : "\n--- stderr ---\n#{result.stderr}")
      output = "#{output[0, 10_000]}\n…\n#{output[-10_000..]}" if output.length > 20_000
      output += "\n(timed out after #{CHECK_TIMEOUT} s)" if result.timed_out
      { "id" => check["id"], "description" => check["description"],
        "command" => repository.test_command + [check["path"]], "exitCode" => result.exit_code,
        "passed" => result.success?, "seconds" => result.seconds, "output" => output }
    end
  end
end

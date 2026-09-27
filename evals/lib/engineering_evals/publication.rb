# frozen_string_literal: true

module EngineeringEvals
  # Builds a reviewable dataset from a batch. Without an attestation it writes only a
  # private preview; with one it publishes to results/datasets, the served directory.
  class Publication
    EMPTY_OBSERVED = {
      "hostVersion" => nil, "sessionId" => nil, "models" => [], "effort" => nil, "mode" => nil, "tools" => [],
      "seconds" => nil, "inputTokens" => nil, "outputTokens" => nil, "skillRead" => nil, "outsideAccess" => [],
      "disabledToolErrors" => 0, "mcpServers" => [], "hostGuidance" => [], "workspaceGuidance" => []
    }.freeze

    def initialize(batch) = @batch = batch

    def publish(attest:, title:)
      runs = @batch.records.filter_map { published_run(_1) }
      keys = runs.map { _1["caseKey"] }.uniq
      dataset = build(runs, keys, attest:, title:)
      serialized = JSON.pretty_generate(dataset)
      preview_path = File.join(@batch.dir, "export-preview.md")
      File.write(preview_path, preview(dataset))
      leaks = Privacy.leaks(serialized)
      raise Error, "Refusing to publish: found #{leaks.join(", ")}. Inspect #{preview_path}." unless leaks.empty?

      unless attest
        puts "Wrote the private preview #{preview_path}."
        puts "Read it, then publish with --attest \"<what you reviewed and why it is safe to publish>\"."
        return
      end
      destination = File.join(Paths.datasets_dir, "#{@batch.id}.json")
      puts "Replacing #{destination}." if File.exist?(destination)
      JsonFile.write(destination, dataset)
      puts "Published #{destination}."
    end

    private

    def build(runs, keys, attest:, title:)
      data = @batch.data
      requested = @batch.requested
      host_versions = runs.filter_map { _1.dig("observed", "hostVersion") }.uniq
      {
        "id" => @batch.id,
        "title" => title || "#{requested["host"]} #{requested["mode"] || requested["model"]} batch #{@batch.id}".squeeze(" "),
        "kind" => "batch",
        "summary" => "#{runs.length} executed run(s) across #{keys.length} case(s), #{data["repetitions"]} repetition(s) per condition.",
        "limitations" => limitations(runs),
        "createdAt" => data["createdAt"],
        "requested" => requested,
        "hostVersion" => host_versions.empty? ? nil : host_versions.join(", "),
        "repetitions" => data["repetitions"],
        "orderSeed" => data["orderSeed"],
        "harness" => revision_label(data["harness"]) + ", source #{data.dig("harness", "sourceSha256").to_s[0, 12]}" +
                     (data.dig("harness", "runtime") ? ", #{data.dig("harness", "runtime")}" : ""),
        "skillsRevision" => revision_label(data["skills"]),
        "attestation" => { "statement" => attest.to_s, "at" => JsonFile.timestamp },
        "cases" => keys.map { case_snapshot(_1) },
        "runs" => runs,
      }
    end

    def revision_label(revision)
      "#{revision["commit"]&.slice(0, 12) || "uncommitted"}#{revision["dirty"] ? " (dirty)" : ""}"
    end

    def limitations(runs)
      list = [
        "Configuration isolation, not an operating-system sandbox: agents could read any file the operator's user can read. Tool inputs that referenced outside paths are listed per run (heuristic).",
        "Host system instructions were present in both conditions; the comparison isolates the supplied skill, not an instruction-free baseline.",
        "Grades are model-assisted rubric judgments, not human calibration. Checks were executed by the harness after each run.",
        "Order seed #{@batch.data["orderSeed"]} randomizes condition order only; it is not a model-sampling seed.",
      ]
      if runs.any? { !_1.dig("observed", "hostGuidance").empty? }
        list << "The host synced account-level skills or plugins into the isolated home (listed per run). The skill tool was not enabled, but their presence is recorded rather than assumed harmless."
      end
      if @batch.host.adapter == "unexercised"
        list << "The #{@batch.host.name} adapter had not been exercised against real output before this batch; verify its observations."
      end
      list
    end

    def case_snapshot(key)
      definition = CaseDefinition.load(@batch.case_snapshot_dir(key))
      {
        "key" => key, "skill" => definition.skill, "name" => definition.name, "version" => definition.version,
        "historicalId" => definition.historical_id, "prompt" => definition.prompt, "expected" => definition.expected,
        "criteria" => definition.criteria, "historyPattern" => definition.history_pattern, "context" => context_items(definition)
      }
    end

    def context_items(definition)
      unless definition.repository?
        return definition.input["files"].map do |file|
          { "kind" => "file", "path" => File.basename(file), "content" => File.read(File.join(definition.dir, file)),
            "provenance" => "Case input, v#{definition.version}" }
        end
      end

      repository = Repository.load(definition.input["repository"])
      items = [{ "kind" => "repository", "name" => repository.name, "url" => repository.url, "ref" => repository.ref,
                 "commit" => repository.commit, "provenance" => "Fresh checkout of the pinned public commit" }]
      if (overlay = definition.input["overlay"])
        items << { "kind" => "patch", "path" => overlay, "content" => File.read(File.join(definition.dir, overlay)),
                   "provenance" => "Seeded before the agent started (part of the case input)" }
      end
      if definition.input["runtime"]
        items << { "kind" => "file", "path" => "EVAL_ENVIRONMENT.md",
                   "content" => "# Evaluation environment\n\n#{repository.agent_notes}\n",
                   "provenance" => "Written by the harness into the checkout" }
      end
      items
    end

    # Account-level skills, plugins, and MCP servers are the operator's private
    # tooling: publish only synced skills that collide with an evaluated skill.
    def public_observed(observed)
      colliding = observed["hostGuidance"].select { |entry| SKILLS.any? { entry == "skill: #{_1}" } }
      others = observed["hostGuidance"].length - colliding.length
      observed.merge(
        "sessionId" => nil,
        "hostGuidance" => colliding + (others.positive? ? ["#{others} other account skill(s) or plugin(s), names withheld"] : []),
        "mcpServers" => observed["mcpServers"].empty? ? [] : ["#{observed["mcpServers"].length} account MCP server(s) connected, names withheld"],
      )
    end

    def published_run(record)
      return nil if record["state"] == "prepared"

      dir = Paths.run_dir(@batch.id, record.dig("run", "id"))
      read = ->(name) { File.exist?(File.join(dir, name)) ? File.read(File.join(dir, name)) : nil }
      resets = record.fetch("resets", [])
      annotations = resets.empty? ? [] : ["Reset #{resets.length} time(s) by an operator: #{resets.map { _1["reason"] }.join("; ")}"]
      outcome = record["outcome"] || {
        "execution" => record["state"] == "setup-failed" ? "setup-failed" : "uncertain",
        "detail" => record["setupError"] || "launched without a recorded exit",
        "model" => "unknown", "tools" => "unknown", "skillIntact" => nil,
        "missingEvidence" => ["run did not finish"], "checks" => "not-run",
      }
      actions = read.call("actions.json")&.then { JSON.parse(_1) }
      planned = record["run"]
      {
        "id" => planned["id"], "caseKey" => @batch.case_key(planned), "pair" => planned["pair"],
        "repetition" => planned["repetition"], "condition" => planned["condition"], "orderInPair" => planned["orderInPair"],
        "prompt" => record["prompt"].to_s,
        # Session identifiers are Amp thread IDs: private provenance, never published.
        "observed" => public_observed(EMPTY_OBSERVED.merge(record["observed"] || {})),
        "outcome" => outcome,
        "response" => Privacy.relativize_workspace_paths(read.call("response.md").to_s),
        "diff" => read.call("changes.diff").to_s,
        "changedPaths" => record["changedPaths"] || [],
        "checks" => Array(record["checks"]).map { _1.merge("output" => Privacy.relativize_workspace_paths(_1["output"].to_s)) },
        "actions" => actions&.map do |a|
          { "tool" => a["tool"], "summary" => Privacy.relativize_workspace_paths(a["summary"]), "error" => a["error"],
            "result" => a["result"]&.then { Privacy.relativize_workspace_paths(_1) } }
        end,
        "grade" => record["grade"],
        "skillSha256" => record["skillFiles"] && JsonFile.sha256(JSON.generate(record["skillFiles"])),
        "annotations" => annotations,
      }
    end

    def preview(dataset)
      lines = ["# Export preview: #{dataset["title"]}", "", "Read everything below before attesting. Nothing here is anonymized automatically.", ""]
      dataset["cases"].each do |c|
        lines.push("## Case #{c["key"]}", "", c["prompt"], "")
        c["context"].each do |item|
          label = item["path"] || item["name"] || ""
          lines.push("### Context: #{item["kind"]} #{label}", "", item["content"] || JSON.generate(item), "")
        end
      end
      dataset["runs"].each do |run|
        lines.push("## Run #{run["id"]}", "", "Outcome: #{JSON.generate(run["outcome"])}", "",
                   "Observed: #{JSON.generate(run["observed"])}", "", "### Response", "", run["response"], "",
                   "### Diff", "", "```diff", run["diff"], "```", "", "### Actions", "")
        lines.concat(Array(run["actions"]).map { "- #{_1["tool"]}: #{_1["summary"]}" })
        lines << ""
        next unless run["grade"]

        lines.push("### Grade", "", *run["grade"]["criteria"].map { "- #{_1["id"]}: #{_1["verdict"]} — #{_1["evidence"]}" }, "",
                   run["grade"]["note"], "")
      end
      lines.join("\n")
    end
  end
end

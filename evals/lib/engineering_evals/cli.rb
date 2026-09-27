# frozen_string_literal: true

require "optparse"

module EngineeringEvals
  # Command-line entry point: `evals/exe/evals <command> [options]`.
  class CLI
    USAGE = <<~TEXT
      Engineering skill evaluations

      Usage: mise run evals -- <command> [options]      (or: ruby evals/exe/evals <command>)

        cases                                  List cases, versions, inputs, and status
        fetch [repository...]                  Fetch pinned repositories and install their runtimes
        prepare <selector...>                  Plan paired runs and prepare isolated workspaces
            --host amp|claude-code             Agent host (default amp)
            --mode <dial>                      Amp mode (default high)
            --model <id>                       Claude model to request, or the model an Amp mode is expected to use
            --effort <level>                   Claude effort to request (Amp does not expose effort)
            --repetitions <n>                  Pairs per case (default 1)
            --seed <n>                         Condition-order seed (default random; recorded)
        run <batch> [--jobs <n>]               Execute prepared runs; never relaunches launched runs
        recollect <batch>                      Re-derive evidence from preserved traces (no relaunch)
        status [batch]                         List batches, or show one batch's runs
        reset <batch> <run> --reason <text>    Archive an attempt and prepare a fresh one (explicit)
        grade <batch> [--mode high] [--run <id>] [--force]
                                               Model-assisted rubric grading of finished runs
        publish <batch> [--attest <statement>] [--title <text>]
                                               Write a private preview; with --attest, publish it
        packet <id> --dataset <id> --title <text> [--pair <pair>...] [--per-skill <n>]
                                               Create a condition-masked calibration packet
        unmask <judgments.json> [--out <file>] Join exported judgments with the private A/B key

      Selectors: all, <skill>, <skill>/<case>, or <skill>/<case>@v<n>.
      The review app is served by SvelteKit: mise run serve (see evals/README.md).
    TEXT

    def self.start(argv)
      new.call(argv)
    rescue Error, OptionParser::ParseError, KeyError, SystemCallError => e
      warn e.message
      exit 1
    end

    def call(argv)
      options = { host: "amp", repetitions: 1, jobs: 2, pairs: [], force: false }
      args = parser(options).parse(argv)
      command = args.shift
      return puts(USAGE) if command.nil? || options[:help]

      dispatch(command, args, options)
    end

    private

    def parser(options)
      OptionParser.new do |o|
        o.on("--host HOST") { options[:host] = _1 }
        o.on("--mode MODE") { options[:mode] = _1 }
        o.on("--model MODEL") { options[:model] = _1 }
        o.on("--effort LEVEL") { options[:effort] = _1 }
        o.on("--repetitions N", Integer) { options[:repetitions] = _1 }
        o.on("--seed N", Integer) { options[:seed] = _1 }
        o.on("--jobs N", Integer) { options[:jobs] = _1 }
        o.on("--reason TEXT") { options[:reason] = _1 }
        o.on("--run ID") { options[:run] = _1 }
        o.on("--force") { options[:force] = true }
        o.on("--attest TEXT") { options[:attest] = _1 }
        o.on("--title TEXT") { options[:title] = _1 }
        o.on("--dataset ID") { options[:dataset] = _1 }
        o.on("--pair PAIR") { options[:pairs] << _1 }
        o.on("--per-skill N", Integer) { options[:per_skill] = _1 }
        o.on("--out FILE") { options[:out] = _1 }
        o.on("-h", "--help") { options[:help] = true }
      end
    end

    def required(value, name)
      value || raise(Error, "Missing #{name}.\n\n#{USAGE}")
    end

    def dispatch(command, args, options)
      case command
      when "cases" then list_cases
      when "fetch" then fetch(args.empty? ? ["rails"] : args)
      when "prepare" then prepare(args, options)
      when "run" then Execution.new(batch(args)).run_all(jobs: [options[:jobs], 1].max)
      when "recollect" then Execution.new(batch(args)).recollect
      when "status" then args.empty? ? puts(Batch.list) : status(batch(args))
      when "reset" then Execution.new(batch(args)).reset(required(args[1], "run id"), required(options[:reason], "--reason"))
      when "grade" then Grading.new(batch(args)).grade(mode: options[:mode] || "high", force: options[:force], only: options[:run])
      when "publish" then Publication.new(batch(args)).publish(attest: options[:attest], title: options[:title])
      when "packet"
        Packets.create(id: required(args[0], "packet id"), title: required(options[:title], "--title"),
                       dataset: required(options[:dataset], "--dataset"), pairs: options[:pairs], per_skill: options[:per_skill])
      when "unmask" then Packets.unmask(required(args[0], "judgments file"), options[:out])
      when "serve" then raise Error, "The review app moved to SvelteKit: run `mise run serve` from the repository root."
      else raise Error, "Unknown command #{command}.\n\n#{USAGE}"
      end
    end

    def batch(args) = Batch.load(required(args[0], "batch id"))

    def list_cases
      CaseDefinition.all.each do |c|
        input = if c.repository?
                  "#{c.input["repository"]}#{c.input["overlay"] ? " + overlay" : ""}#{c.input["runtime"] ? " + runtime" : ""}"
                else
                  c.input["files"].join(", ")
                end
        status = c.runnable? ? "runnable" : "blocked: #{c.status["reason"]}"
        puts "#{c.key.ljust(48)} #{c.historical_id.ljust(18)} #{input.ljust(36)} #{c.checks.length} check(s)  #{status}"
      end
    end

    def fetch(names)
      names.each do |name|
        repository = Repository.load(name)
        repository.ensure_fetched
        repository.ensure_toolchain
        puts "#{name}: #{repository.ref} (#{repository.commit}) and its runtime are ready."
      end
    end

    def prepare(selectors, options)
      host = Hosts.for(options[:host])
      amp = host == Hosts::Amp
      batch = Batch.create(
        cases: CaseDefinition.select(CaseDefinition.all, selectors),
        repetitions: [options[:repetitions], 1].max, seed: options[:seed],
        requested: { "host" => host.name, "mode" => amp ? (options[:mode] || "high") : nil, "model" => options[:model],
                     "effort" => amp ? nil : options[:effort], "tools" => host.default_tools },
      )
      batch.records.select { _1["state"] == "setup-failed" }.each { puts "setup failed  #{_1.dig("run", "id")}: #{_1["setupError"]}" }
      puts "Prepared batch #{batch.id}: #{batch.runs.length} runs, order seed #{batch.data["orderSeed"]}."
      puts "Next: mise run evals -- run #{batch.id}"
    end

    def status(batch)
      requested = batch.requested
      puts "#{batch.id}: #{requested["host"]} mode=#{requested["mode"] || "-"} model=#{requested["model"] || "-"} " \
           "seed=#{batch.data["orderSeed"]} (#{batch.host.adapter} adapter)"
      batch.runs.each do |run|
        record = batch.record(run["id"])
        outcome = record["outcome"]
        summary = if outcome
                    models = Array(record.dig("observed", "models")).join(",")
                    "#{outcome["execution"]}; model #{outcome["model"]} (#{models.empty? ? "?" : models}); tools #{outcome["tools"]}; " \
                      "checks #{outcome["checks"]}#{record["grade"] ? "; graded" : ""}"
                  elsif record["state"] == "launched" then "uncertain: launched without a recorded exit"
                  else record["setupError"].to_s
                  end
        puts "  #{run["id"].ljust(62)} #{record["state"].ljust(12)} #{summary}"
      end
    end
  end
end

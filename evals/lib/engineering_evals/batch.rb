# frozen_string_literal: true

require "securerandom"

module EngineeringEvals
  # A batch of paired runs: its plan (batch.json), per-case snapshots, and one
  # private record per run (runs/<id>/run.json). Records use the same JSON shape
  # as earlier versions, so existing batches remain readable and resumable.
  class Batch
    # The only difference between conditions: the supplied skill directory and this line.
    SKILL_INSTRUCTION = "Read reference/SKILL.md and apply its guidance to this task."

    # Shared by both conditions; verbatim from the pilot for comparability.
    CONFINEMENT = "Work only in this task checkout and its supplied reference, if any. Do not inspect other runs, " \
                  "grading files, unrelated directories, credentials, or personal configuration. Do not launch " \
                  "another agent through a CLI. Use the tools actually available; report missing capabilities " \
                  "honestly. Do not push, publish, or change external services."

    # Harness-owned workspace paths, excluded from diffs.
    HARNESS_PATHS = %w[/reference/ /.eval-runtime/ /EVAL_ENVIRONMENT.md].freeze
    GUIDANCE_NAMES = %w[AGENTS.md AGENT.md CLAUDE.md .agents .claude].freeze
    FIXED_GIT_DATE = "2026-01-01T00:00:00Z"

    attr_reader :data

    def self.compose_prompt(task, condition)
      [condition == "with-skill" ? SKILL_INSTRUCTION : nil, task, CONFINEMENT].compact.join("\n\n")
    end

    def self.load(id)
      path = File.join(Paths.batch_dir(id), "batch.json")
      raise Error, "No batch #{id} in #{Paths.batches_dir}" unless File.exist?(path)

      new(JsonFile.read(path))
    end

    def self.list = File.directory?(Paths.batches_dir) ? Dir.children(Paths.batches_dir).sort : []

    # Seeded condition order (mulberry32, identical to earlier versions for the same
    # seed and selection). The seed orders conditions only; it does not seed models.
    def self.order_random(seed)
      state = seed & 0xFFFFFFFF
      lambda do
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4_294_967_296.0
      end
    end

    def self.imul(a, b) = (a * b) & 0xFFFFFFFF

    def self.plan(cases, repetitions, seed)
      random = order_random(seed)
      cases.flat_map do |c|
        (1..repetitions).flat_map do |repetition|
          pair = "#{c.skill}.#{c.name}.v#{c.version}.r#{repetition}"
          order = random.call < 0.5 ? CONDITIONS : CONDITIONS.reverse
          order.each_with_index.map do |condition, index|
            { "id" => "#{pair}.#{condition}", "case" => c.ref, "repetition" => repetition,
              "condition" => condition, "pair" => pair, "orderInPair" => index + 1 }
          end
        end
      end
    end

    def self.create(cases:, requested:, repetitions:, seed: nil)
      blocked = cases.reject(&:runnable?)
      raise Error, "Blocked cases cannot run: #{blocked.map(&:key).join(", ")}" unless blocked.empty?

      Hosts.for(requested.fetch("host")).preflight
      repositories = cases.select(&:repository?).map { _1.input["repository"] }.uniq.map { Repository.load(_1) }
      repositories.each do |repository|
        repository.ensure_fetched
        runtime = cases.any? { _1.repository? && _1.input["repository"] == repository.name && _1.input["runtime"] }
        repository.ensure_toolchain if runtime
      end

      order_seed = seed || SecureRandom.random_number(2**31)
      id = "#{Time.now.utc.strftime("%Y%m%d-%H%M")}-#{requested["host"]}-#{SecureRandom.alphanumeric(3).downcase}"
      data = {
        "id" => id, "createdAt" => JsonFile.timestamp, "requested" => requested, "repetitions" => repetitions,
        "orderSeed" => order_seed,
        "harness" => Revision.of("evals").merge("sourceSha256" => Revision.harness_source_hash, "runtime" => "ruby #{RUBY_VERSION}"),
        "skills" => Revision.of("skills"),
        "toolchains" => repositories.to_h { [_1.name, _1.toolchain_versions] },
        "runs" => plan(cases, repetitions, order_seed),
      }
      JsonFile.write(File.join(Paths.batch_dir(id), "batch.json"), data)
      batch = new(data)
      # Snapshot each case: preparation and publication read these, never the working copy.
      FileUtils.mkdir_p(File.join(batch.dir, "cases"))
      cases.each { FileUtils.cp_r(_1.dir, batch.case_snapshot_dir(_1.key)) }
      batch.runs.each { batch.prepare_run(_1) }
      batch
    end

    def initialize(data) = @data = data

    def id = data.fetch("id")
    def runs = data.fetch("runs")
    def requested = data.fetch("requested")
    def host = Hosts.for(requested.fetch("host"))
    def dir = Paths.batch_dir(id)
    def run(id) = runs.find { _1["id"] == id } || raise(Error, "#{id} is not in #{self.id}")

    def case_key(planned) = CaseDefinition.key(*planned["case"].values_at("skill", "name", "version"))
    def case_snapshot_dir(key) = File.join(dir, "cases", key.tr("/@", ".."))
    def snapshot_for(planned) = CaseDefinition.load(case_snapshot_dir(case_key(planned)))

    def record_path(run_id) = File.join(Paths.run_dir(id, run_id), "run.json")
    def record(run_id) = JsonFile.read(record_path(run_id))
    def records = runs.map { record(_1["id"]) }
    def save(record) = JsonFile.write(record_path(record.dig("run", "id")), record)

    def context(record)
      run_dir = Paths.run_dir(id, record.dig("run", "id"))
      runtime_path = File.join(run_dir, "runtime-env.json")
      Hosts::Context.new(run_dir:, work_dir: File.join(run_dir, "work"), home_dir: File.join(run_dir, "home"),
                         prompt: record["prompt"].to_s, requested:,
                         runtime_env: File.exist?(runtime_path) ? JsonFile.read(runtime_path) : {})
    end

    def prepare_run(planned)
      run_dir = Paths.run_dir(id, planned["id"])
      work = File.join(run_dir, "work")
      record = { "run" => planned, "state" => "prepared", "resets" => [] }
      begin
        definition = snapshot_for(planned)
        FileUtils.mkdir_p([work, File.join(run_dir, "home")])
        runtime_env = definition.repository? ? prepare_repository(definition, work) : prepare_files(definition, work)
        File.write(File.join(work, ".git", "info", "exclude"), "#{HARNESS_PATHS.join("\n")}\n", mode: "a")
        record["baseCommit"] = git(work, "rev-parse", "HEAD")
        if planned["condition"] == "with-skill"
          FileUtils.cp_r(File.join(Paths.skills_dir, planned.dig("case", "skill")), File.join(work, "reference"))
          record["skillFiles"] = JsonFile.hash_tree(File.join(work, "reference"))
        end
        record["prompt"] = self.class.compose_prompt(definition.prompt, planned["condition"])
        File.write(File.join(run_dir, "prompt.txt"), record["prompt"])
        JsonFile.write(File.join(run_dir, "runtime-env.json"), runtime_env)
        host.prepare(context(record))
        record["observedAtPreparation"] = { "workspaceGuidance" => workspace_guidance(work) }
        record["preparedAt"] = JsonFile.timestamp
      rescue StandardError => e
        record["state"] = "setup-failed"
        record["setupError"] = e.message
      end
      save(record)
      record
    end

    private

    def git(dir, *args)
      Subprocess.run!(["git", "-c", "user.name=evaluation", "-c", "user.email=evaluation@localhost",
                       "-c", "commit.gpgsign=false", "-C", dir, *args],
                      env: { "GIT_AUTHOR_DATE" => FIXED_GIT_DATE, "GIT_COMMITTER_DATE" => FIXED_GIT_DATE })
    end

    def prepare_files(definition, work)
      definition.input["files"].each { FileUtils.cp(File.join(definition.dir, _1), File.join(work, File.basename(_1))) }
      git(work, "init", "--quiet")
      git(work, "add", "--all")
      git(work, "commit", "--quiet", "--message", "Evaluation input")
      {}
    end

    def prepare_repository(definition, work)
      repository = Repository.load(definition.input["repository"])
      repository.materialize(work)
      if (overlay = definition.input["overlay"])
        git(work, "apply", File.join(definition.dir, overlay))
        git(work, "commit", "--quiet", "--all", "--message", "Evaluation input")
      end
      return {} unless definition.input["runtime"]

      runtime = File.join(work, ".eval-runtime")
      FileUtils.cp_r(repository.runtime_source, runtime)
      File.write(File.join(work, "EVAL_ENVIRONMENT.md"), "# Evaluation environment\n\n#{repository.agent_notes}\n")
      repository.runtime_environment(runtime)
    end

    # Guidance files that could reach the agent from ancestors or the checkout.
    def workspace_guidance(work)
      ancestors = []
      dir = File.dirname(work)
      until dir == File.dirname(dir)
        GUIDANCE_NAMES.each { ancestors << File.join(dir, _1) if File.exist?(File.join(dir, _1)) }
        dir = File.dirname(dir)
      end
      tracked = Subprocess.run!(["git", "-C", work, "ls-files"]).split("\n").select do |file|
        GUIDANCE_NAMES.any? { |n| file == n || file.end_with?("/#{n}") || file.start_with?("#{n}/") || file.include?("/#{n}/") }
      end
      ancestors + tracked.map { "workspace: #{_1}" }
    end
  end
end

# frozen_string_literal: true

module EngineeringEvals
  SKILLS = %w[naming-things shaping implementing explaining-code building-skills].freeze
  CONDITIONS = %w[without-skill with-skill].freeze
  CRITERION_KINDS = %w[task process mixed].freeze

  # A versioned case (cases/<skill>/<name>/case.json). Nested inputs, criteria, and
  # checks stay as the JSON hashes they are on disk: publication copies them as-is.
  CaseDefinition = Data.define(:skill, :name, :version, :historical_id, :status, :prompt, :input,
                               :expected, :criteria, :checks, :history_pattern, :version_notes, :dir) do
    def self.load(dir)
      path = File.join(dir, "case.json")
      data = JsonFile.read(path)
      Validation.new(path).case!(data)
      new(skill: data["skill"], name: data["name"], version: data["version"], historical_id: data["historicalId"],
          status: data["status"], prompt: data["prompt"], input: data["input"], expected: data["expected"],
          criteria: data["criteria"], checks: data.fetch("checks", []), history_pattern: data["historyPattern"],
          version_notes: data.fetch("versionNotes", []), dir:)
    end

    def self.key(skill, name, version) = "#{skill}/#{name}@v#{version}"

    def self.all
      SKILLS.flat_map do |skill|
        Dir.children(File.join(Paths.cases_dir, skill)).sort.map do |name|
          definition = load(File.join(Paths.cases_dir, skill, name))
          unless definition.skill == skill && definition.name == name
            raise Error, "#{definition.dir}: skill/name must match its directory"
          end

          definition
        end
      end
    end

    # Select by skill, `skill/case`, exact `skill/case@vN`, or `all`.
    def self.select(cases, selectors)
      raise Error, "Select cases: all, <skill>, <skill>/<case>, or <skill>/<case>@v<n>" if selectors.empty?

      selected = selectors.flat_map do |selector|
        matches = cases.select { |c| selector == "all" || [c.skill, "#{c.skill}/#{c.name}", c.key].include?(selector) }
        raise Error, "No case matches #{selector}" if matches.empty?

        matches
      end
      cases.select { selected.include?(_1) }
    end

    def key = self.class.key(skill, name, version)
    def runnable? = status["kind"] == "runnable"
    def repository? = input["kind"] == "repository"
    def ref = { "skill" => skill, "name" => name, "version" => version }
  end

  # Structural checks for case files, reported with the file path.
  class Validation
    def initialize(path) = @path = path

    def case!(data)
      require_keys(data, %w[skill name version historicalId status prompt input expected criteria])
      fail!("unknown skill #{data["skill"]}") unless SKILLS.include?(data["skill"])
      fail!("name must be lowercase words joined by hyphens") unless data["name"].to_s.match?(/\A[a-z0-9-]+\z/)
      fail!("version must be a positive integer") unless data["version"].is_a?(Integer) && data["version"].positive?
      status!(data["status"])
      input!(data["input"])
      fail!("criteria must not be empty") if Array(data["criteria"]).empty?
      data["criteria"].each { criterion!(_1) }
      Array(data["checks"]).each { check!(_1) }
    end

    private

    def status!(status)
      kind = status.is_a?(Hash) && status["kind"]
      fail!("status must be runnable or blocked with a reason") unless kind == "runnable" || (kind == "blocked" && status["reason"])
    end

    def input!(input)
      case input.is_a?(Hash) && input["kind"]
      when "files" then fail!("files input needs files") if Array(input["files"]).empty?
      when "repository" then require_keys(input, %w[repository])
      else fail!("input kind must be files or repository")
      end
    end

    def criterion!(criterion)
      require_keys(criterion, %w[id kind text])
      fail!("unknown criterion kind #{criterion["kind"]}") unless CRITERION_KINDS.include?(criterion["kind"])
    end

    def check!(check)
      case check["kind"]
      when "repository-test" then require_keys(check, %w[id description path])
      when "file-equals" then require_keys(check, %w[id description path expected])
      else fail!("check kind must be repository-test or file-equals")
      end
    end

    def require_keys(hash, keys)
      fail!("expected an object") unless hash.is_a?(Hash)
      missing = keys.reject { hash.key?(_1) }
      fail!("missing #{missing.join(", ")}") unless missing.empty?
    end

    def fail!(message) = raise(Error, "#{@path}: #{message}")
  end
end

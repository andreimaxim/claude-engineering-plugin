# frozen_string_literal: true

module EngineeringEvals
  # A pinned public repository with its toolchain and focused runtime
  # (repositories.json). Sources and installed gems live under $EVALS_HOME.
  class Repository
    attr_reader :name, :url, :commit, :ref, :license, :toolchain

    def self.load(name)
      data = JsonFile.read(Paths.repositories_file).fetch(name) do
        raise Error, "Unknown repository #{name}; add it to repositories.json"
      end
      new(name, data)
    end

    def initialize(name, data)
      @name = name
      @url, @commit, @ref, @license, @toolchain = data.values_at("url", "commit", "ref", "license", "toolchain")
      raise Error, "#{name}: commit must be a full SHA" unless @commit.to_s.match?(/\A\h{40}\z/)
    end

    def cache_path = File.join(Paths.repos_dir, "#{name}.git")
    def toolchain_path = File.join(Paths.toolchains_dir, "#{name}-#{commit[0, 12]}")
    def runtime_source = File.join(Paths.evals_root, toolchain.fetch("runtimeDir"))
    def test_command = toolchain.fetch("testCommand")
    def agent_notes = toolchain.fetch("agentNotes")

    # Fetch the pinned commit into a bare cache outside this repository. Idempotent.
    def ensure_fetched
      unless File.directory?(cache_path)
        FileUtils.mkdir_p(cache_path)
        Subprocess.run!(["git", "init", "--quiet", "--bare", cache_path])
      end
      return if Subprocess.run(["git", "-C", cache_path, "cat-file", "-e", "#{commit}^{commit}"]).success?

      puts "Fetching #{url} #{ref} (#{commit[0, 12]})…"
      Subprocess.run!(["git", "-C", cache_path, "fetch", "--quiet", "--depth", "1", url, commit])
    end

    # Environment for runtime commands in a prepared checkout; `{runtime}` and
    # `{toolchainDir}` placeholders are substituted.
    def runtime_environment(runtime_dir)
      substitutions = { "runtime" => runtime_dir, "toolchainDir" => toolchain_path }
      toolchain.fetch("env").transform_values { |value| value.gsub(/\{(\w+)\}/) { substitutions.fetch(Regexp.last_match(1), _1) } }
    end

    # Check the toolchain, then install the pinned runtime into the toolchain cache.
    # Children get a Bundler-free environment plus only the runtime's variables.
    def ensure_toolchain
      toolchain.fetch("probes").each do |probe|
        next if (Subprocess.run(probe).success? rescue false)

        raise Error, "#{name} needs #{toolchain["description"]} (#{probe.join(" ")} failed)"
      end
      env = runtime_environment(runtime_source)
      return if Subprocess.run(toolchain.fetch("verify"), env:, chdir: runtime_source).success?

      puts "Installing the #{name} runtime into #{toolchain_path}…"
      Subprocess.run!(toolchain.fetch("install"), env:, chdir: runtime_source)
      Subprocess.run!(toolchain.fetch("verify"), env:, chdir: runtime_source)
    end

    # Probe output (for example `ruby --version`), recorded with each batch.
    def toolchain_versions
      toolchain.fetch("probes").to_h do |probe|
        result = (Subprocess.run(probe) rescue nil)
        [probe.join(" "), result&.success? ? result.stdout.strip : nil]
      end
    end

    # A fresh, independent checkout of the pinned commit with no link to the cache.
    def materialize(destination)
      Subprocess.run!(["git", "init", "--quiet", destination])
      Subprocess.run!(["git", "-C", destination, "fetch", "--quiet", "--depth", "1", cache_path, commit])
      Subprocess.run!(["git", "-C", destination, "checkout", "--quiet", "--detach", commit])
    end
  end
end

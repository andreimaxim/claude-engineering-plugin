# frozen_string_literal: true

module EngineeringEvals
  # Tracked, public locations inside this repository and private state outside it.
  module Paths
    module_function

    def evals_root = File.expand_path("../..", __dir__)
    def repo_root = File.dirname(evals_root)
    def cases_dir = File.join(evals_root, "cases")
    def skills_dir = File.join(repo_root, "skills")
    def repositories_file = File.join(evals_root, "repositories.json")

    # Reviewed, publishable evidence. The review app serves only files listed here.
    # EVALS_RESULTS_DIR points both the CLI and the app elsewhere (e.g. a scratch copy).
    def results_dir = File.expand_path(ENV.fetch("EVALS_RESULTS_DIR", File.join(evals_root, "results")))
    def datasets_dir = File.join(results_dir, "datasets")
    def packets_dir = File.join(results_dir, "packets")

    # Private state: repository caches, runtimes, run workspaces, raw traces, and
    # calibration keys. Always outside this repository and never served.
    def state_home
      ENV.fetch("EVALS_HOME") do
        File.join(ENV.fetch("XDG_STATE_HOME", File.join(Dir.home, ".local", "state")), "engineering-evals")
      end.then { File.expand_path(_1) }
    end

    def repos_dir = File.join(state_home, "repos")
    def toolchains_dir = File.join(state_home, "toolchains")
    def batches_dir = File.join(state_home, "batches")
    def keys_dir = File.join(state_home, "keys")
    def batch_dir(batch) = File.join(batches_dir, batch)
    def run_dir(batch, run) = File.join(batches_dir, batch, "runs", run)
  end
end

# frozen_string_literal: true

module EngineeringEvals
  # Revisions recorded with each batch.
  module Revision
    module_function

    # This repository's commit and whether `path` has uncommitted changes.
    def of(path)
      head = Subprocess.run(["git", "-C", Paths.repo_root, "rev-parse", "HEAD"])
      status = Subprocess.run(["git", "-C", Paths.repo_root, "status", "--porcelain", "--", path])
      { "commit" => head.success? ? head.stdout.strip : nil, "dirty" => !status.stdout.strip.empty? }
    end

    # Content hash of the harness source, so dirty-tree batches remain distinguishable.
    def harness_source_hash
      root = File.join(Paths.evals_root, "lib")
      files = Dir.glob("**/*.rb", base: root).sort + ["../exe/evals"]
      JsonFile.sha256(files.map { "#{_1}:#{JsonFile.sha256(File.binread(File.join(root, _1)))}" }.join("\n"))
    end
  end
end

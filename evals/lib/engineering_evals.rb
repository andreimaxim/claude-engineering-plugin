# frozen_string_literal: true

# Paired skill evaluations: prepare isolated workspaces, run agent hosts with and
# without a supplied skill, collect observed evidence, grade, publish reviewed
# datasets, and build condition-masked calibration packets.
#
# The harness uses only Ruby's standard library, so nothing about its own load path
# can leak into the Bundler runtime of an evaluated repository.
module EngineeringEvals
  class Error < StandardError; end
end

require_relative "engineering_evals/paths"
require_relative "engineering_evals/json_file"
require_relative "engineering_evals/subprocess"
require_relative "engineering_evals/case_definition"
require_relative "engineering_evals/repository"
require_relative "engineering_evals/revision"
require_relative "engineering_evals/stream_trace"
require_relative "engineering_evals/hosts"
require_relative "engineering_evals/batch"
require_relative "engineering_evals/execution"
require_relative "engineering_evals/grading"
require_relative "engineering_evals/privacy"
require_relative "engineering_evals/publication"
require_relative "engineering_evals/packets"
require_relative "engineering_evals/cli"

# frozen_string_literal: true

require "tmpdir"

module EngineeringEvals
  # Child processes without a shell. Output streams straight to files, so an agent's
  # trace is durable while it runs; each child gets its own process group so a
  # timeout stops the whole tree.
  module Subprocess
    Result = Data.define(:status, :stdout, :stderr, :seconds, :timed_out) do
      def success? = status&.success? && !timed_out
      def exit_code = status&.exitstatus
    end

    # Variables that would make a child resolve gems through someone else's bundle.
    HARNESS_VARIABLES = /\A(BUNDLE_|BUNDLER_|RUBYGEMS_GEMDEPS\z|RUBYOPT\z|RUBYLIB\z|GEM_HOME\z|GEM_PATH\z)/

    module_function

    # The operator's environment minus Ruby/Bundler variables, plus explicit additions.
    def clean_environment(extra = {})
      ENV.to_h.reject { |key, _| key.match?(HARNESS_VARIABLES) }.merge(extra)
    end

    # Run argv. With `exact_env`, the child sees only `env` (host isolation);
    # otherwise it sees the cleaned operator environment merged with `env`.
    def run(argv, env: {}, exact_env: false, chdir: nil, timeout: nil, stdout: nil, stderr: nil)
      Dir.mktmpdir("evals-process") do |scratch|
        out_path = stdout || File.join(scratch, "stdout")
        err_path = stderr || File.join(scratch, "stderr")
        environment = exact_env ? env : clean_environment(env)
        started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
        pid = Process.spawn(environment, *argv, unsetenv_others: true, chdir: chdir || Dir.pwd,
                                                out: [out_path, "w"], err: [err_path, "w"], in: File::NULL, pgroup: true)
        status, timed_out = wait(pid, timeout)
        Result.new(status:, stdout: File.read(out_path), stderr: File.read(err_path),
                   seconds: Process.clock_gettime(Process::CLOCK_MONOTONIC) - started, timed_out:)
      end
    end

    # Run argv and return stripped stdout, raising when it fails.
    def run!(argv, **options)
      result = run(argv, **options)
      return result.stdout.strip if result.success?

      detail = [result.stderr, result.stdout].map(&:strip).reject(&:empty?).first
      raise Error, "#{argv.join(" ")} exited #{result.exit_code}: #{detail}"
    end

    def wait(pid, timeout)
      deadline = timeout && (Process.clock_gettime(Process::CLOCK_MONOTONIC) + timeout)
      loop do
        _, status = Process.waitpid2(pid, Process::WNOHANG)
        return [status, false] if status
        return [terminate(pid), true] if deadline && Process.clock_gettime(Process::CLOCK_MONOTONIC) > deadline

        sleep 0.2
      end
    end

    # Ask the process group to stop, then force it; returns the reaped status.
    def terminate(pid)
      signal_group("TERM", pid)
      20.times do
        _, status = Process.waitpid2(pid, Process::WNOHANG)
        return status if status

        sleep 0.25
      end
      signal_group("KILL", pid)
      Process.waitpid2(pid).last
    end

    def signal_group(signal, pid)
      Process.kill(signal, -pid)
    rescue Errno::ESRCH
      nil
    end
  end
end

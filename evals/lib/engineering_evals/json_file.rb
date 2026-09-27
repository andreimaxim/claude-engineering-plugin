# frozen_string_literal: true

require "digest"
require "fileutils"
require "json"
require "time"

module EngineeringEvals
  # JSON persistence. Files keep the camelCase keys of the existing on-disk format,
  # so records and datasets written by earlier versions stay readable.
  module JsonFile
    module_function

    def read(path)
      JSON.parse(File.read(path))
    rescue JSON::ParserError => e
      raise Error, "#{path}: #{e.message}"
    end

    # Write atomically so an interrupted process never leaves a torn state file.
    def write(path, value)
      FileUtils.mkdir_p(File.dirname(path))
      temporary = "#{path}.#{Process.pid}.#{Thread.current.object_id}.tmp"
      File.write(temporary, "#{JSON.pretty_generate(value)}\n")
      File.rename(temporary, path)
    end

    def sha256(data) = Digest::SHA256.hexdigest(data)

    # Hashes of every regular file below root, keyed by relative path in sorted order.
    def hash_tree(root)
      Dir.glob("**/*", File::FNM_DOTMATCH, base: root).sort
         .select { File.file?(File.join(root, _1)) }
         .to_h { [_1, sha256(File.binread(File.join(root, _1)))] }
    end

    def timestamp = Time.now.utc.iso8601(3)
  end
end

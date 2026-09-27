# frozen_string_literal: true

module EngineeringEvals
  # Publication guards. They catch obvious leaks before a human attests to an
  # export; they are not anonymization and do not replace reading the preview.
  module Privacy
    SECRET_PATTERNS = {
      "private key" => /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      "API-style secret" => /\b(sk|ghp|gho|ghs|xox[bap])[-_][A-Za-z0-9_-]{16,}/,
      "Amp thread identifier" => /\bT-\h{8}-\h{4}-\h{4}-\h{4}-\h{12}\b/,
    }.freeze

    module_function

    def leaks(text)
      found = SECRET_PATTERNS.filter_map { |label, pattern| label if text.match?(pattern) }
      ENV.each do |key, value|
        next unless value.length >= 12 && key.match?(/KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|EMAIL/i)

        found << "value of $#{key}" if text.include?(value)
      end
      found.uniq
    end

    # Rewrite absolute evaluation workspace paths (which embed run identities) as relative paths.
    def relativize_workspace_paths(text)
      text.gsub(%r{(?:file://)?/[^\s()\[\]"'`<>]*?/work(?:/|(?=[\s)\]"'`<>]|\z))}, "")
    end
  end
end

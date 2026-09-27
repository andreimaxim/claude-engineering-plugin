# frozen_string_literal: true

require "securerandom"

module EngineeringEvals
  # Condition-masked calibration packets. The served packet holds only the task,
  # original context, and each answer; the A/B key goes to $EVALS_HOME/keys.
  module Packets
    DISCLOSURE = "Answers are labelled A and B with a random assignment per item; the key is stored outside this app. " \
                 "Labels, grades, rubrics, run metadata, timing, and token counts are hidden. This is not guaranteed " \
                 "blinding: writing style, explicit references to a supplied skill, and prior exposure to these cases can " \
                 "still reveal a condition. Absolute workspace paths were rewritten as relative paths; the substance of " \
                 "each answer is unchanged."

    JUDGMENT_FORMAT = "engineering-evals.judgments.v1"

    module_function

    def packet_path(id) = File.join(Paths.packets_dir, "#{id}.json")
    def key_path(id) = File.join(Paths.keys_dir, "#{id}.json")

    # Item hashes are SHA-256 of the item's compact JSON without its hash. Ruby's
    # JSON.generate matches JavaScript's JSON.stringify for these string-only
    # values, so hashes of existing packets stay reproducible.
    def item_hash(item) = JsonFile.sha256(JSON.generate(item.except("sha256")))

    def create(id:, title:, dataset:, pairs:, per_skill:)
      raise Error, "Packet ids use lowercase letters, digits, dots, and hyphens." unless id.match?(/\A[a-z0-9][a-z0-9.-]*\z/)
      # Browser drafts are tied to a packet's exact bytes, so packets are immutable.
      raise Error, "Packet #{id} already exists; choose a new id." if File.exist?(packet_path(id)) || File.exist?(key_path(id))

      data = JsonFile.read(File.join(Paths.datasets_dir, "#{dataset}.json"))
      snapshots = data.fetch("cases").to_h { [_1["key"], _1] }
      eligible = eligible_pairs(data.fetch("runs"))
      chosen = if pairs.any?
                 pairs.map { |pair| eligible.find { _1[:pair] == pair } || raise(Error, "#{pair} is not an eligible pair in #{dataset}") }
               else
                 eligible.group_by { snapshots.fetch(_1[:without]["caseKey"])["skill"] }.values
                         .flat_map { _1.shuffle(random: SecureRandom).first(per_skill || 1) }
               end

      items = []
      key_items = []
      chosen.shuffle(random: SecureRandom).each_with_index do |entry, index|
        snapshot = snapshots.fetch(entry[:without]["caseKey"])
        a, b = SecureRandom.random_number(2).zero? ? [entry[:with], entry[:without]] : [entry[:without], entry[:with]]
        item_id = format("item-%02d", index + 1)
        item = { "id" => item_id, "skill" => snapshot["skill"], "title" => "#{snapshot["skill"]}: #{snapshot["name"]}",
                 "prompt" => snapshot["prompt"], "context" => snapshot["context"], "a" => mask(a), "b" => mask(b) }
        items << item.merge("sha256" => item_hash(item))
        key_items << { "id" => item_id, "dataset" => data["id"], "caseKey" => snapshot["key"], "pair" => entry[:pair],
                       "a" => { "run" => a["id"], "condition" => a["condition"] },
                       "b" => { "run" => b["id"], "condition" => b["condition"] } }
      end

      JsonFile.write(packet_path(id), { "id" => id, "title" => title, "createdAt" => JsonFile.timestamp,
                                        "source" => data["title"], "disclosure" => DISCLOSURE, "items" => items })
      packet_sha = JsonFile.sha256(File.binread(packet_path(id)))
      JsonFile.write(key_path(id), { "packet" => id, "packetSha256" => packet_sha, "items" => key_items })
      File.chmod(0o600, key_path(id))
      puts "Wrote packet #{packet_path(id)} (#{items.length} items, sha256 #{packet_sha[0, 12]})."
      puts "Wrote the private A/B key #{key_path(id)}. It is never served; do not copy it into the repository."
    end

    def eligible_pairs(runs)
      usable = ->(run) { run && run.dig("outcome", "execution") == "succeeded" && !run["response"].to_s.strip.empty? }
      runs.group_by { _1["pair"] }.filter_map do |pair, members|
        without = members.find { _1["condition"] == "without-skill" }
        with = members.find { _1["condition"] == "with-skill" }
        { pair:, without:, with: } if usable.call(without) && usable.call(with)
      end
    end

    def mask(run) = { "response" => Privacy.relativize_workspace_paths(run["response"]), "diff" => run["diff"] }

    # Join exported judgments with the private key, verifying every hash. Output stays private.
    def unmask(export_path, out_path)
      export = JsonFile.read(export_path)
      raise Error, "#{export_path} is not a #{JUDGMENT_FORMAT} export" unless export["format"] == JUDGMENT_FORMAT

      key = JsonFile.read(key_path(export.fetch("packet")))
      bytes = File.binread(packet_path(export["packet"]))
      packet = JSON.parse(bytes)
      problems = []
      unless [export["packetSha256"], JsonFile.sha256(bytes)].all?(key["packetSha256"])
        problems << "the export, key, and served packet do not share one packet hash"
      end
      rows = export.fetch("judgments").map do |judgment|
        item = key["items"].find { _1["id"] == judgment["item"] }
        served = packet["items"].find { _1["id"] == judgment["item"] }
        raise Error, "Unknown item #{judgment["item"]}" unless item && served

        problems << "#{judgment["item"]}: judged evidence differs from the packet" unless served["sha256"] == judgment["itemSha256"]
        verdict = ->(condition) { item.dig("a", "condition") == condition ? judgment["a"] : judgment["b"] }
        preferred = %w[a b].include?(judgment["preference"]) ? item.dig(judgment["preference"], "condition") : judgment["preference"]
        { "item" => item["id"], "caseKey" => item["caseKey"], "pair" => item["pair"],
          "withSkill" => verdict.call("with-skill"), "withoutSkill" => verdict.call("without-skill"),
          "preferred" => preferred, "correction" => judgment["correction"], "notes" => judgment["notes"] }
      end
      result = { "packet" => export["packet"], "reviewer" => export["reviewer"], "exportedAt" => export["exportedAt"],
                 "problems" => problems, "rows" => rows }
      problems.each { warn "warning: #{_1}" }
      rows.each do |row|
        warn "#{row["item"]} #{row["caseKey"]}: with #{row["withSkill"] || "-"}, without #{row["withoutSkill"] || "-"}, " \
             "preferred #{row["preferred"] || "-"}"
      end
      return puts(JSON.pretty_generate(result)) unless out_path

      if File.expand_path(out_path).start_with?(Paths.results_dir)
        raise Error, "Unmasked judgments must not be written into the served results directory."
      end

      File.write(out_path, "#{JSON.pretty_generate(result)}\n")
      File.chmod(0o600, out_path)
      warn "Wrote #{out_path}."
    end
  end
end

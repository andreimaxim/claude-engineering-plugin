# frozen_string_literal: true

module ExportStatus
  LABELS = {
    queued: "Waiting to start",
    running: "Building report",
    succeeded: "Ready to download",
    failed: "Export failed",
  }.freeze

  module_function

  def label(status)
    LABELS.fetch(status, "Unknown status")
  end
end

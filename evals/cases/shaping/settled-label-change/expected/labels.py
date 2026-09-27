STATUS_LABELS = {
    "queued": "Waiting to start",
    "running": "Preparing export",
    "succeeded": "Ready to download",
    "failed": "Export failed",
}


def status_label(status):
    return STATUS_LABELS.get(status, "Unknown status")

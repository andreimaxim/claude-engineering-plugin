def record_carrier_acceptance(shipment, accepted_at):
    """The carrier has taken the parcel for onward transport."""
    shipment["completed_at"] = accepted_at


def record_delivery_receipt(shipment, receipt_arrived_at):
    """The recipient's signed delivery receipt has reached our system."""
    shipment["completed_at"] = receipt_arrived_at


def stored_row(shipment):
    # Everything we persist. Which writer set completed_at is not saved.
    return {
        "id": shipment["id"],
        "completed_at": shipment.get("completed_at"),
    }


def public_response(shipment):
    # Returned to external API clients.
    return {
        "id": shipment["id"],
        "completedAt": shipment.get("completed_at"),
    }


def customer_status(shipment):
    if shipment.get("completed_at") is not None:
        return f"Delivered at {shipment['completed_at']}"
    return "In transit"

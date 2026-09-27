# frozen_string_literal: true

module Parcel
  module_function

  # The carrier has taken the parcel for onward transport.
  def record_carrier_acceptance(shipment, accepted_at)
    shipment[:completed_at] = accepted_at
  end

  # The recipient's signed delivery receipt has reached our system.
  def record_delivery_receipt(shipment, receipt_arrived_at)
    shipment[:completed_at] = receipt_arrived_at
  end

  # Everything we persist. Which writer set completed_at is not saved.
  def stored_row(shipment)
    { id: shipment[:id], completed_at: shipment[:completed_at] }
  end

  # Returned to external API clients.
  def public_response(shipment)
    { id: shipment[:id], completedAt: shipment[:completed_at] }
  end

  def customer_status(shipment)
    return "In transit" if shipment[:completed_at].nil?

    "Delivered at #{shipment[:completed_at]}"
  end
end

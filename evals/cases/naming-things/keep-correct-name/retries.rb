# frozen_string_literal: true

class TransientError < StandardError; end

module Delivery
  module_function

  def send_with_backoff(message, sender:, max_attempts: 3, pause: method(:sleep))
    attempt = 0
    begin
      attempt += 1
      sender.call(message)
    rescue TransientError
      raise if attempt >= max_attempts

      pause.call(2**attempt)
      retry
    end
  end
end

# frozen_string_literal: true

# Held-back evaluator check. It is never copied into the agent workspace.
require "abstract_unit"

class CaptureUnwindCheck < ActionView::TestCase
  class Failure < StandardError; end

  def setup
    super
    @output_buffer = ActionView::OutputBuffer.new
  end

  def test_normal_nesting
    outer = capture do
      @output_buffer << "outer-before "
      inner = capture { @output_buffer << "inner" }
      @output_buffer << "[#{inner}] outer-after"
    end
    assert_equal "outer-before [inner] outer-after", outer
    assert_equal "", @output_buffer.to_s
  end

  def test_rescued_nested_failure_keeps_surrounding_output
    outer = capture do
      @output_buffer << "before "
      begin
        capture do
          @output_buffer << "partial-inner"
          raise Failure
        end
      rescue Failure
        @output_buffer << "rescued "
      end
      @output_buffer << "after"
    end
    assert_equal "before rescued after", outer
  end

  def test_capture_inside_an_active_rescue
    @output_buffer << "page "
    begin
      raise Failure
    rescue Failure
      fallback = capture { @output_buffer << "fallback" }
      @output_buffer << fallback
    end
    @output_buffer << " end"
    assert_equal "page fallback end", @output_buffer.to_s
  end

  def test_exception_propagates_and_buffer_is_restored
    @output_buffer << "kept"
    assert_raises(Failure) { capture { @output_buffer << "lost"; raise Failure } }
    @output_buffer << "!"
    assert_equal "kept!", @output_buffer.to_s
  end

  def test_buffer_identity_is_preserved
    buffer = @output_buffer
    begin
      capture { raise Failure }
    rescue Failure
    end
    assert_same buffer, @output_buffer
    assert_equal "kept", capture { @output_buffer << "kept"; @output_buffer }
  end

  def test_escaping_is_unchanged
    assert_equal "&lt;b&gt;", capture { "<b>" }
    assert_equal "<b>", capture { "<b>".html_safe }
    assert_equal "&lt;i&gt;", capture { @output_buffer << "<i>" }
  end
end

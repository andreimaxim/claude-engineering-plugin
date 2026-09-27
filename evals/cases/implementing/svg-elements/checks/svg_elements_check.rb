# frozen_string_literal: true

# Held-back evaluator check. It is never copied into the agent workspace.
require "abstract_unit"

class SvgFilterElementsCheck < ActionView::TestCase
  tests ActionView::Helpers::TagHelper

  def test_empty_calls_self_close_with_svg_spelling
    assert_equal "<feGaussianBlur />", tag.fe_gaussian_blur
    assert_equal "<feComponentTransfer />", tag.fe_component_transfer
  end

  def test_attributes_on_empty_calls
    assert_equal %(<feGaussianBlur in="SourceGraphic" stdDeviation="5" />),
      tag.fe_gaussian_blur(in: "SourceGraphic", stdDeviation: "5")
  end

  def test_content_argument_is_escaped
    assert_equal "<feComponentTransfer>&lt;b&gt;x&lt;/b&gt;</feComponentTransfer>",
      tag.fe_component_transfer("<b>x</b>")
    assert_equal "<feGaussianBlur><b>x</b></feGaussianBlur>",
      tag.fe_gaussian_blur("<b>x</b>", escape: false)
  end

  def test_block_content
    assert_equal %(<feComponentTransfer><animate attributeName="x" /></feComponentTransfer>),
      tag.fe_component_transfer { tag.animate(attributeName: "x") }
    assert_equal "<feGaussianBlur>&lt;x&gt;</feGaussianBlur>", tag.fe_gaussian_blur { "<x>" }
  end

  def test_attribute_values_are_escaped
    assert_equal %(<feGaussianBlur result="&quot;&gt;&lt;x" />), tag.fe_gaussian_blur(result: %(\"><x))
  end

  def test_existing_html_and_svg_behavior_is_unchanged
    assert_equal "<br>", tag.br
    assert_equal "<div>&lt;b&gt;</div>", tag.div("<b>")
    assert_equal %(<animateMotion dur="10s" />), tag.animate_motion(dur: "10s")
  end

  def test_custom_elements_are_unchanged
    assert_equal "<my-widget></my-widget>", tag.my_widget
    assert_equal %(<fe-custom data-x="1">y</fe-custom>), tag.fe_custom("y", data: { x: 1 })
  end
end

require "application_system_test_case"

class FrequenciesTest < ApplicationSystemTestCase
  setup do
    @frequency = frequencies(:one)
  end

  test "visiting the index" do
    visit frequencies_url
    assert_selector "h1", text: "Frequencies"
  end

  test "should create frequency" do
    visit frequencies_url
    click_on "New frequency"

    fill_in "Name", with: @frequency.name
    click_on "Create Frequency"

    assert_text "Frequency was successfully created"
    click_on "Back"
  end

  test "should update Frequency" do
    visit frequency_url(@frequency)
    click_on "Edit this frequency", match: :first

    fill_in "Name", with: @frequency.name
    click_on "Update Frequency"

    assert_text "Frequency was successfully updated"
    click_on "Back"
  end

  test "should destroy Frequency" do
    visit frequency_url(@frequency)
    click_on "Destroy this frequency", match: :first

    assert_text "Frequency was successfully destroyed"
  end
end

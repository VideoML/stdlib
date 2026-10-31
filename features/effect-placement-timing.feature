Feature: Immutable placement timing for frame effects
  Scenario Outline: Absolute seeks preserve the copied half-open interval
    Given an effect placed from frame <start> to frame <end> at <fps> frames per second
    When the caller changes its original configuration after mount
    Then the effect retains a frozen copy of its placement
    And visibility follows the original half-open interval for forward, reverse and repeated seeks
    And seek receives absolute composition frames
    Examples:
      | fps | start | end |
      | 24  | 7     | 13  |
      | 30  | 9     | 16  |

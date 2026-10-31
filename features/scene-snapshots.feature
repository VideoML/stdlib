Feature: Bounded authored scene snapshots
  Scenario: An effect declares a fixed source scene and frame
    Given a registered descriptor declaring its scene and frame parameter names
    When its validated parameters reference an authored scene and absolute frame
    Then preparation can enumerate the reference without creating the effect
  Scenario: A consumer requests an unavailable scene source
    Given an effect context without a scene snapshot provider
    When a scene snapshot is requested
    Then it fails with SCENE_CAPTURE_UNAVAILABLE
  Scenario: A capture completes after cancellation
    Given a pending scene snapshot capture
    When its signal is aborted before the bitmap arrives
    Then the request rejects and the late bitmap is closed

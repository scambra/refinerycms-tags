@tags
Feature: Tags
  In order to have tags on my website
  As an administrator
  I want to manage tags

  Background:
    Given I am a logged in refinery user
    And I have no tags

  @tags-list @list
  Scenario: Tags List
   Given I have tags titled UniqueTitleOne, UniqueTitleTwo
   When I go to the list of tags
   Then I should see "UniqueTitleOne"
   And I should see "UniqueTitleTwo"

  @tags-valid @valid
  Scenario: Create Valid Tag
    When I go to the list of tags
    And I follow "Add New Tag"
    And I fill in "Name" with "This is a test of the first string field"
    And I press "Save"
    Then I should see "'This is a test of the first string field' was successfully added."
    And I should have 1 tag

  @tags-invalid @invalid
  Scenario: Create Invalid Tag (without name)
    When I go to the list of tags
    And I follow "Add New Tag"
    And I press "Save"
    Then I should see "Name can't be blank"
    And I should have 0 tags

  @tags-edit @edit
  Scenario: Edit Existing Tag
    Given I have tags titled "A name"
    When I go to the list of tags
    And I follow "Edit this tag" within ".actions"
    Then I fill in "Name" with "A different name"
    And I press "Save"
    Then I should see "'A different name' was successfully updated."
    And I should be on the list of tags
    And I should not see "A name"

  @tags-duplicate @duplicate
  Scenario: Create Duplicate Tag
    Given I only have tags titled UniqueTitleOne, UniqueTitleTwo
    When I go to the list of tags
    And I follow "Add New Tag"
    And I fill in "Name" with "UniqueTitleTwo"
    And I press "Save"
    Then I should see "There were problems"
    And I should have 2 tags

  @tags-delete @delete
  Scenario: Delete Tag
    Given I only have tags titled UniqueTitleOne
    When I go to the list of tags
    And I follow "Remove this tag forever"
    Then I should see "'UniqueTitleOne' was successfully removed."
    And I should have 0 tags
 
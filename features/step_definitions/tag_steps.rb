Given /^I have no tags$/ do
  Tag.delete_all
end

Given /^I (only )?have tags titled "?([^\"]*)"?$/ do |only, titles|
  Tag.delete_all if only
  titles.split(', ').each do |title|
    Tag.create(:name => title)
  end
end

Then /^I should have ([0-9]+) tags?$/ do |count|
  Tag.count.should == count.to_i
end

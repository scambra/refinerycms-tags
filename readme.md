# Tags engine for Refinery CMS.

## Requirements

This engine requires RefineryCMS version >= 1.0.0 and acts-as-taggable >= 2.2.2

## Gem Installation

Ensure you have created your application's database before adding this engine (with ``rake db:setup``).

Open your ``Gemfile`` and add this line to the bottom:

    gem 'refinerycms-tags', '~> 1.0.0'

Now run ``bundle install`` and once bundler has installed the gem run:

    rails generate refinerycms_tags
    rake db:migrate

Now, restart your web server and enjoy.

## Use it in forms

Render the partial ``tag_editor``, set field local variable to the tag list and enable autocomplete if you want:

    <%= render :partial => "/shared/admin/tag_editor", :locals => {
          :f => f,
          :field => :activity_list,
          :autocomplete => true
        } %>
        
Use ``tag_list`` option to display a tag list with all created tags next to the field. You can show only some tags setting ``tags`` option.

    <%= render :partial => "/shared/admin/tag_editor", :locals => {
          :f => f,
          :field => :activity_list,
          :autocomplete => true,
          :show_tag_list => true,
          :tags => @more_used_tags
        } %>

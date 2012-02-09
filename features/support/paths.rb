module NavigationHelpers
  module Refinery
    module Tags
      def path_to(page_name)
        case page_name
        when /the list of tags/
          admin_tags_path

         when /the new tag form/
          new_admin_tag_path
        else
          nil
        end
      end
    end
  end
end

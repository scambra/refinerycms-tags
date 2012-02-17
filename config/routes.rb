::Refinery::Application.routes.draw do
  scope(:path => 'refinery', :as => 'admin', :module => 'admin') do
    resources :tags, :only => [:index, :destroy]
  end
end

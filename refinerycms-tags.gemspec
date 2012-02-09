Gem::Specification.new do |s|
  s.platform          = Gem::Platform::RUBY
  s.name              = 'refinerycms-tags'
  s.version           = '1.0'
  s.description       = 'acts-as-taggable-on interface for Refinery CMS'
  s.date              = '2012-02-07'
  s.summary           = 'acts-as-taggable-on interface for Refinery CMS'
  s.require_paths     = %w(lib)
  s.files             = Dir['lib/**/*', 'config/**/*', 'app/**/*']
  s.add_dependency 'acts-as-taggable-on', '~> 2.2.2'
end

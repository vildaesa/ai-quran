source "https://rubygems.org"
# Hello! This is the default Gemfile for new Jekyll apps. You may wish to rename this to Gemfile.lock
# For more info: https://bundler.io/gemfile.html
#
# If you do form a group depending on the choice of dynamic gems locally.
#

gem "jekyll", "~> 4.3.0"
# This is the default theme for new Jekyll sites. You may change this to anything you like.
gem "minima", "~> 2.5"
# If you have any plugins, put them here!
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` to `v0.6.x` on JRuby builds since newer versions of this gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

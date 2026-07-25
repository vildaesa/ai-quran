require 'dotenv'
Dotenv.load

Jekyll::Hooks.register :site, :after_init do |site|
  # Create a hash for env variables if it doesn't exist
  site.config['env'] ||= {}

  [
    'API_KEY',
    'AUTH_DOMAIN',
    'PROJECT_ID',
    'APP_ID',
    'CLIENT_KEY',
    'SERVER_KEY',
    'STORAGE_BUCKET',
    'DATABASE_URL',
    'SENDER_ID',
    'TEMPLATE_LICENSE'
  ].each do |var|
    value = ENV[var]
    site.config[var] = value
    site.config['env'][var] = value
  end
end
const path = require('path');

// Load the Push Blaster's next.config.ts
const pushBlasterConfig = require('./tools/push-blaster/next.config.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...pushBlasterConfig.default,
  // Additional root-level config
  webpack: (config, options) => {
    console.log('🏗️ Root next.config.js webpack called');
    
    // First apply Push Blaster's webpack config
    if (pushBlasterConfig.default.webpack) {
      config = pushBlasterConfig.default.webpack(config, options);
    }
    
    // Add root-level aliases
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@/lib': path.join(__dirname, 'tools/push-blaster/src/lib'),
    };
    
    console.log('🔧 Root config aliases:', config.resolve.alias);
    return config;
  },
};

module.exports = nextConfig; 
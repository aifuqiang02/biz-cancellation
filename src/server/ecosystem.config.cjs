module.exports = {
  apps: [
    {
      name: 'biz-cancellation',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 40361,
      },
    },
  ],
};
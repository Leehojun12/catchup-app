/** PM2 background dev processes — `npm run dev:bg` */
module.exports = {
  apps: [
    {
      name: 'catchup-backend',
      cwd: './backend',
      script: './node_modules/nodemon/bin/nodemon.js',
      args: 'src/index.js',
      env: {
        NODE_ENV: 'development',
      },
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'catchup-expo',
      cwd: './frontend',
      script: './node_modules/expo/bin/cli',
      args: 'start --lan --non-interactive',
      env: {
        NODE_ENV: 'development',
        EXPO_NO_TELEMETRY: '1',
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};

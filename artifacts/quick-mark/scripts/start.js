const path = require('path');
const { spawn } = require('child_process');
const { loadEnvFiles } = require('./load-env');

loadEnvFiles();

if (!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY;
}

const expoBinary = process.platform === 'win32'
  ? path.join(__dirname, '..', 'node_modules', '.bin', 'expo.cmd')
  : path.join(__dirname, '..', 'node_modules', '.bin', 'expo');

const expo = spawn(expoBinary, process.argv.slice(2), {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    npm_config_user_agent: 'npm/10',
  },
  stdio: 'inherit',
});

expo.on('error', (error) => {
  console.error(`Could not start Expo: ${error.message}`);
  process.exitCode = 1;
});

expo.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exitCode = code ?? 1;
  }
});
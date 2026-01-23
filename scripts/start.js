#!/usr/bin/env node

const { execSync } = require('child_process');

const app = process.env.START_APP || 'api';

const commands = {
  api: 'npm run start:api',
  landing: 'npm run start:landing',
  web: 'npm --workspace apps/web run start',
};

const command = commands[app];

if (!command) {
  console.error(`Unknown app: ${app}. Valid options: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

console.log(`Starting ${app}...`);
execSync(command, { stdio: 'inherit' });

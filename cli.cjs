#!/usr/bin/env node
// cli.cjs
const path = require('path');
const childProcess = require('child_process');

const serverPath = path.join(__dirname, 'dist', 'server.js');
childProcess.spawn('node', [serverPath], {
    stdio: 'inherit'
});
const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = async function () {
  require('./environment.cjs');
  execFileSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.join(__dirname, '..'), env: process.env, stdio: 'pipe',
  });
};

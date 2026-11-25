const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const buildDir = path.join(projectRoot, 'client', 'dist');
const publicDir = path.join(projectRoot, 'public');

if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.error('Client build not found. Run "npm --prefix client run build" first.');
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.cpSync(buildDir, publicDir, { recursive: true, force: true });
console.log('Published the Vite client build to public/.');

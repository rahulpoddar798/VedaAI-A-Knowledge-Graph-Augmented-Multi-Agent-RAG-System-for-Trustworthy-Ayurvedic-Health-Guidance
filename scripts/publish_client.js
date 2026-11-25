const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function atomicWrite(target, data) {
  const temp = target + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temp, data, { flag: 'wx' });
    fs.renameSync(temp, target);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

function publishClient(buildDir, publicDir) {
  const assetsDir = path.join(publicDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  if (fs.realpathSync(assetsDir) !== path.join(fs.realpathSync(publicDir), 'assets')) {
    throw new Error('Expected a local managed assets directory.');
  }
  const manifest = path.join(publicDir, '.veda-managed-assets.json');
  const previous = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
  const source = path.join(buildDir, 'assets');
  const next = fs.readdirSync(source);
  const managed = [...new Set([...previous, ...next])];
  if (!managed.every(name => /^[\w.-]+-[\w-]{8}\.(js|css)$/.test(name))) throw new Error('Invalid managed asset name.');
  const index = fs.readFileSync(path.join(buildDir, 'index.html'));
  for (const name of next) {
    const target = path.join(assetsDir, name);
    if (!previous.includes(name) && fs.existsSync(target) && !fs.readFileSync(target).equals(fs.readFileSync(path.join(source, name)))) {
      throw new Error('Generated asset collides with an unmanaged file.');
    }
  }
  const saveManifest = names => atomicWrite(manifest, JSON.stringify(names, null, 2) + '\n');
  // Journal the union first so interrupted updates can be retried safely.
  saveManifest(managed);
  for (const name of next) atomicWrite(path.join(assetsDir, name), fs.readFileSync(path.join(source, name)));
  const staticDir = path.join(__dirname, '..', 'client', 'public');
  for (const file of fs.readdirSync(staticDir, { recursive: true, withFileTypes: true })) {
    if (!file.isFile()) continue;
    const rel = path.relative(staticDir, path.join(file.parentPath, file.name));
    const target = path.join(publicDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(buildDir, rel), target);
  }
  atomicWrite(path.join(publicDir, 'index.html'), index);
  for (const name of previous) {
    if (!next.includes(name)) fs.rmSync(path.join(assetsDir, name), { force: true });
  }
  saveManifest(next);
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  publishClient(path.join(root, 'client', 'dist'), path.join(root, 'public'));
}
module.exports = { publishClient };

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public');

const COPY_DIRS = ['css', 'js', 'Images', 'directory'];
const COPY_FILES = ['robots.txt', 'sitemap.xml'];

function copyStaticAssets() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  for (const name of fs.readdirSync(root)) {
    if (name.endsWith('.html')) {
      fs.copyFileSync(path.join(root, name), path.join(out, name));
    }
  }

  for (const file of COPY_FILES) {
    const src = path.join(root, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(out, file));
    }
  }

  for (const dir of COPY_DIRS) {
    const src = path.join(root, dir);
    if (fs.existsSync(src)) {
      fs.cpSync(src, path.join(out, dir), { recursive: true });
    }
  }

  console.log('Prepared public/ for Vercel static deploy');
}

copyStaticAssets();

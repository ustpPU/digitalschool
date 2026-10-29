import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url));
test('sharing metadata and local brand assets are ready for the GitHub Pages project path',()=>{
 const html=read('index.html').toString();
 assert.match(html,/<meta property="og:image" content="https:\/\/ustppu.github.io\/digitalschool\/og-image.png"/);
 assert.match(html,/<meta name="twitter:card" content="summary_large_image"/);
 assert.match(html,/<link rel="canonical" href="https:\/\/ustppu.github.io\/digitalschool\/"/);
 for(const [file,w,h] of [['public/og-image.png',1200,630],['public/favicon-32.png',32,32],['public/apple-touch-icon.png',180,180]]){
  const b=read(file);assert.equal(b.readUInt32BE(16),w);assert.equal(b.readUInt32BE(20),h);
 }
 for(const p of ['public/brand/ppd-petaling-utama.png','public/og-image.png','public/favicon-32.png','public/apple-touch-icon.png']){
  const b=read(p);let at=8;while(at<b.length){const len=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);assert.ok(!['eXIf','iTXt','tEXt','zTXt'].includes(type),`${p}: private metadata chunk ${type}`);at+=len+12}
 }
 const registry=JSON.parse(read('public/data/school-metadata.json'));
 const overrides=JSON.parse(read('scripts/category-overrides.json'));
 assert.deepEqual(registry.schools.BBD8471,overrides.BBD8471);assert.deepEqual(registry.unmatched,[]);
});

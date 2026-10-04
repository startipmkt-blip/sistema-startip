const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(distDir, 'assets');

// Read all asset files
const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const mainJsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const chunkFiles = files.filter(f => f.endsWith('.js') && f !== mainJsFile);

const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const mainJs = fs.readFileSync(path.join(assetsDir, mainJsFile), 'utf8');

// Read chunks and inline them by replacing dynamic import paths
let combinedJs = mainJs;
for (const chunk of chunkFiles) {
  const chunkContent = fs.readFileSync(path.join(assetsDir, chunk), 'utf8');
  // We'll include chunks as separate base64 blocks
}

// Encode to base64
const cssB64 = Buffer.from(css, 'utf8').toString('base64');

// For JS, we need to handle chunks. The main JS uses dynamic imports like:
// import("./EmojiPicker-xxx.js") - these won't work inline.
// We need to replace chunk references with inline data URIs or bundle everything.

// Strategy: Replace dynamic import paths with data URIs
let fullJs = mainJs;
for (const chunk of chunkFiles) {
  const chunkContent = fs.readFileSync(path.join(assetsDir, chunk), 'utf8');
  const chunkB64 = Buffer.from(chunkContent, 'utf8').toString('base64');
  const dataUri = `data:text/javascript;base64,${chunkB64}`;

  // Replace references like "./EmojiPicker-Dm8_TWyd.js" with the data URI
  const escaped = chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  fullJs = fullJs.replace(new RegExp(`"\\./${escaped}"`, 'g'), `"${dataUri}"`);
  fullJs = fullJs.replace(new RegExp(`'\\./${escaped}'`, 'g'), `'${dataUri}'`);
}

const jsB64 = Buffer.from(fullJs, 'utf8').toString('base64');

// Read public files
const publicDir = path.join(__dirname, 'public');
let manifestLink = '';
let iconLink = '';
if (fs.existsSync(path.join(publicDir, 'manifest.webmanifest'))) {
  manifestLink = '<link rel="manifest" href="/manifest.webmanifest" />';
}

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Startip OS</title>
    <meta name="description" content="Sistema operacional interno da Startip." />
    <meta name="theme-color" content="#0EA5E9" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon.svg" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Startip" />
    <meta name="mobile-web-app-capable" content="yes" />

  <script>
(function(){
  function toBytes(b64){var bin=atob(b64);var arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr;}
  function toText(b64){return new TextDecoder('utf-8').decode(toBytes(b64));}
  var css=toText("${cssB64}");
  var js=toText("${jsB64}");
  var styleEl=document.createElement('style');
  styleEl.textContent=css;
  document.head.appendChild(styleEl);
  var scriptEl=document.createElement('script');
  scriptEl.type='module';
  scriptEl.textContent=js;
  document.head.appendChild(scriptEl);
})();
</script>
</head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'deploy', 'index.html'), html, 'utf8');
console.log('deploy/index.html generated successfully!');
console.log(`Size: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);

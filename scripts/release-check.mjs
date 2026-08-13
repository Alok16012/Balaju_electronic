import {existsSync, readdirSync, readFileSync} from 'node:fs';

const required=['dist/index.html','public/manifest.webmanifest','public/robots.txt','public/sitemap.xml','.env.example','docs/API_CONTRACT.md','docs/DEPLOYMENT_RUNBOOK.md'];
const failures=required.filter(file=>!existsSync(file));
const images=readdirSync('public/assets/products').filter(file=>/^product-\d{2}\.jpg$/.test(file));
if(images.length!==50) failures.push(`expected 50 product images, found ${images.length}`);
const source=readFileSync('src/main.jsx','utf8');
for(const token of ['AZADI40','salePrice','ErrorBoundary']) if(!source.includes(token)) failures.push(`missing ${token}`);
if(failures.length){console.error('Release check failed:',failures);process.exit(1)}
console.log('Release check passed: build shell, 50 images, commerce controls and deployment documents present.');

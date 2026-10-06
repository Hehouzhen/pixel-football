import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css','/club.css':'club.css','/hub.css':'hub.css','/career.css':'career.css','/ui-refresh.css':'ui-refresh.css','/news.css':'news.css','/awards.css':'awards.css','/transfers.css':'transfers.css'};
const port=Number(process.argv[2])||4173;
createServer(async(req,res)=>{const name=files[req.url?.split('?')[0]];if(!name){res.writeHead(404).end();return;}try{const body=await readFile(new URL('./dist/'+name,import.meta.url));res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html; charset=utf-8'}).end(body);}catch{res.writeHead(500).end();}}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}`));

import {build} from 'esbuild';
await build({entryPoints:['src.jsx'],bundle:true,minify:true,outfile:'dist/app.js',define:{'process.env.NODE_ENV':'"production"'}});

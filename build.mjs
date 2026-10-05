import {build} from 'esbuild';
await build({entryPoints:['src.jsx'],bundle:true,minify:true,outfile:'dist/app.js',loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'}});

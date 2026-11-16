import {readFile,writeFile,mkdir} from 'node:fs/promises';
const esbuild=await import(process.env.ACME_ESBUILD || 'esbuild');
const shared={bundle:true,minify:true,jsx:'automatic',target:['es2020'],format:'iife',legalComments:'eof',define:{'process.env.NODE_ENV':'"production"'},loader:{'.txt':'text'},nodePaths:process.env.ACME_NODE_PATH?[process.env.ACME_NODE_PATH]:[]};
const offline=await esbuild.build({...shared,entryPoints:['player/offline.jsx'],outfile:'offline.js',write:false});
const js=offline.outputFiles.find(f=>f.path.endsWith('.js')).text,css=offline.outputFiles.find(f=>f.path.endsWith('.css')).text;
await mkdir('assets',{recursive:true});
await esbuild.build({...shared,entryPoints:['player/entry.jsx'],outfile:'assets/player.js',plugins:[{name:'offline',setup(b){b.onResolve({filter:/^acme:/},a=>({path:a.path,namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},a=>({contents:a.path.endsWith('css')?css:js,loader:'text'}));}}]});
await writeFile('assets/LICENSES.txt',await readFile('player/vendor/LICENSES.txt'));
console.log('Built local player and embedded offline runtime.');

if(process.env.ACME_CHECKS==='1') {
 await mkdir('checks/output',{recursive:true});
 await esbuild.build({...shared,platform:'node',format:'cjs',entryPoints:['player/export.js'],outfile:'checks/output/export-module.cjs',plugins:[{name:'offline',setup(b){b.onResolve({filter:/^acme:/},a=>({path:a.path,namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},a=>({contents:a.path.endsWith('css')?css:js,loader:'text'}));}}]});
}

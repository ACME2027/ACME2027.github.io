import runtime from 'acme:offline-js';
import css from 'acme:offline-css';
import {publicCase} from './model.js';
import {zipFiles} from './zip.js';
const json=v=>JSON.stringify(v,null,2).replace(/</g,'\\u003c');
export function exportFiles(input){
 const c=publicCase(input),{renderCode,config,data,dm,widgets,sentences,resolutions,...meta}=c;
 return {
  'index.html':'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; style-src \'self\' \'unsafe-inline\'; frame-src about:; connect-src \'none\'; img-src data: blob:"><title>Visualization</title><link rel="stylesheet" href="styles.css"></head><body><main id="case" class="acme-offline"></main><script src="data.js"></script><script src="config.js"></script><script src="render.js"></script><script src="case.js"></script><script src="runtime.js"></script></body></html>',
  'data.js':'window.ACME_DATA = '+json(data)+';\n',
  'config.js':'window.ACME_CONFIG = '+json(config)+';\n',
  'render.js':'window.ACME_RENDER_CODE = '+json(renderCode)+';\n',
  'case.js':'window.ACME_CASE = '+json(meta)+';\n',
  'runtime.js':runtime,'styles.css':css
 };
}
export function downloadCase(c){
 const blob=zipFiles(exportFiles(c)),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(c.id.replace(/[^a-zA-Z0-9_-]/g,'-')||'visualization')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

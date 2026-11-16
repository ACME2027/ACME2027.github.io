import d3 from './vendor/d3.min.txt';
import sankey from './vendor/d3-sankey.min.js.txt';
import topojson from './vendor/topojson-client.min.js.txt';
import cloud from './vendor/d3.layout.cloud.js.txt';
const vendors={sankey,topojson,cloud};
import {sandboxRuntime} from './sandbox.js';
const scriptSafe=s=>s.replace(/<\/script/gi,'<\\/script');
export function frameDocument(libraries=[]) {
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; connect-src 'none'; img-src data: blob:"><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:white;font-family:Georgia,serif}#editor-stage{position:relative;width:100%;height:100vh}#chart-root{display:flex;justify-content:center;align-items:center;box-sizing:border-box;width:100%;height:100vh;padding:12px;min-width:0}#chart-root svg{max-width:100%;max-height:calc(100vh - 24px);width:auto;height:auto}#editor-overlay{position:absolute;inset:0;z-index:10;pointer-events:none;overflow:visible}.editor-generated-guidance__outline{fill:rgba(37,99,235,.08);stroke:#2563eb;stroke-width:2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke;pointer-events:none}.editor-generated-guidance__anchor{fill:white;stroke:#2563eb;stroke-width:3;vector-effect:non-scaling-stroke}.editor-generated-guidance__instruction{fill:#1d4ed8;stroke:white;stroke-width:5;paint-order:stroke;font:600 13px system-ui;pointer-events:none}
</style><script>${scriptSafe(d3)}</script>${libraries.map(name=>`<script>${scriptSafe(vendors[name])}</script>`).join('')}</head><body><div id="editor-stage"><div id="chart-root"></div><svg id="editor-overlay" aria-hidden="true"></svg></div><script>(${scriptSafe(sandboxRuntime.toString())})()</script></body></html>`;
}

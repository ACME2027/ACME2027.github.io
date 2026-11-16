export function clone(value) { return structuredClone(value); }
function parts(path) {
  if (typeof path !== 'string' || !path || path.split('.').some(p => !p || ['__proto__','constructor','prototype'].includes(p))) throw new Error('Invalid configuration path');
  return path.split('.');
}
export function readPath(value, path) { return parts(path).reduce((v,p) => v?.[p],value); }
export function setPath(value,path,next) {
  const keys=parts(path), result=clone(value); let node=result;
  keys.forEach((key,i) => {
    if (!node || typeof node !== 'object' || !Object.hasOwn(node,key)) throw new Error('Configuration path does not exist: '+path);
    if (i===keys.length-1) node[key]=clone(next); else node=node[key];
  });
  return result;
}
export function mappedConfig(config,writeBack,value) {
  const mode=writeBack?.visualization?.mode;
  if (mode==='none') return config;
  if (mode!=='config_patch') throw new Error('This interaction requires unsupported non-local processing');
  return writeBack.visualization.mappings.reduce((next,m) => {
    const output=m.outputPath==='$'?value:readPath(value,m.outputPath.replace(/^\$\./,''));
    if (output===undefined) throw new Error('Interaction output is missing');
    if (!['add','replace'].includes(m.strategy)) throw new Error('Invalid write-back strategy');
    const before=readPath(next,m.configPath);
    if(m.strategy==='add' && (![before,output].every(n=>typeof n==='number' && Number.isFinite(n)))) throw new Error('Invalid numeric write-back');
    return setPath(next,m.configPath,m.strategy==='add'?before+output:output);
  },config);
}
export function publicCase(raw) {
  if (!raw || typeof raw.renderCode!=='string' || !raw.config || !raw.id) throw new Error('A case needs id, renderCode, data and config');
  const widgets=(raw.widgets||[]).map(w=>({id:w.id,label:w.label,adapterId:w.adapterId,config:clone(w.config||{}),writeBack:clone(w.writeBack),...(w.dependsOn?{dependsOn:clone(w.dependsOn)}:{})}));
  const dm=raw.dm ? Object.fromEntries(['kind','adapterId','slotId','guidance','module','writeBack'].map(k=>[k,clone(raw.dm[k])])):undefined;
  for (const interaction of [...widgets,...(dm?[dm]:[])]) {
    if (!['config_patch','none'].includes(interaction.writeBack?.visualization?.mode)) throw new Error('Only local write-back is supported; prepare this case offline first');
    for(const m of interaction.writeBack.visualization.mappings||[]) parts(m.configPath);
  }
  if(dm?.kind && dm.kind!=='generated_dm') throw new Error('Only generated DM is supported');
  const modality=raw.modality || (dm?'DM':'IW');
  return {id:String(raw.id),modality,renderCode:raw.renderCode,data:clone(raw.data??null),config:clone(raw.config),widgets,sentences:(raw.sentences||[]).map(sentence=>sentence.flatMap(s=>s.type==='text'?[{type:'text',text:String(s.text)}]:s.type==='widget'&&widgets.some(w=>w.id===s.widgetId)?[{type:'widget',widgetId:s.widgetId}]:[])),...(dm?{dm}:{}),resolutions:clone(raw.resolutions||{}),libraries:(raw.libraries||[]).filter(n=>['sankey','topojson','cloud'].includes(n)),height:Math.max(160,Math.min(1200,Number(raw.height)||300)),...(raw.viewport?{viewport:{width:Math.max(160,Math.min(4000,Number(raw.viewport.width)||400)),height:Math.max(160,Math.min(1200,Number(raw.viewport.height)||300))}}:{})};
}

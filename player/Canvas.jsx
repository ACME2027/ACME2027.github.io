import React,{useEffect,useMemo,useRef,useState} from 'react';
import {frameDocument} from './frame';
import {clone,mappedConfig,publicCase,readPath} from './model';
import {Widget} from './Widget';

export function VisualizationCanvas({example,onExport}) {
 const initial=useMemo(()=>publicCase(example),[example]);
 const srcdoc=useMemo(()=>frameDocument(initial.libraries),[initial]);
 const [config,setConfig]=useState(()=>clone(initial.config));
 const [resolutions,setResolutions]=useState(()=>clone(initial.resolutions));
 const [ready,setReady]=useState(false),[rendered,setRendered]=useState(false),[error,setError]=useState(''),[exporting,setExporting]=useState(false);
 const iframe=useRef(null),version=useRef(0),timer=useRef(null);
 const state=useRef({config,resolutions});state.current={config,resolutions};
 function resolve(spec,value,id) {
  try {
   const next=mappedConfig(state.current.config,spec.writeBack,value);
   const values={...state.current.resolutions,[id]:clone(value)};
   const changed=next!==state.current.config;state.current={config:next,resolutions:values};setConfig(next);setResolutions(values);setError('');if(changed)setRendered(false);
  } catch(e) {setError(e.message);setRendered(false);}
 }
 const resolver=useRef(resolve);resolver.current=resolve;
 useEffect(()=>{
  function receive(event) {
   if(event.source!==iframe.current?.contentWindow || !event.data || typeof event.data!=='object')return;
   const msg=event.data;
   if(msg.type==='sandbox_ready'){setReady(true);return;}
   if(msg.renderVersion!==version.current)return;
   if(msg.type==='render_success'){clearTimeout(timer.current);setRendered(true);setError('');}
   if(msg.type==='render_error'||msg.type==='interaction_error'){clearTimeout(timer.current);setError(String(msg.error));setRendered(false);}
   if(msg.type==='clarification_resolution' && initial.dm && msg.slotId===initial.dm.slotId && msg.adapterId===initial.dm.adapterId) resolver.current(initial.dm,msg.value,initial.dm.slotId);
  }
  window.addEventListener('message',receive);return()=>{window.removeEventListener('message',receive);clearTimeout(timer.current);};
 },[initial]);
 useEffect(()=>{
  if(!ready)return;
  setRendered(false);const id=++version.current;
  timer.current=setTimeout(()=>{if(version.current===id){setError('Visualization did not finish rendering.');setRendered(false);}},5500);
  iframe.current.contentWindow.postMessage({type:'render',requestId:id,renderCode:initial.renderCode,data:initial.data,config,clarificationInteraction:initial.dm},'*');
  return()=>clearTimeout(timer.current);
 },[ready,config,initial]);
 function widgetValue(w) {
  if(Object.hasOwn(resolutions,w.id))return resolutions[w.id];
  const m=w.writeBack.visualization.mappings||[];
  if(m.length===1 && m[0].outputPath==='$')return readPath(config,m[0].configPath);
  return w.config.initialValue;
 }
 async function exportCurrent() {
  setExporting(true);
  try{await onExport(publicCase({...initial,...state.current,viewport:{width:iframe.current.clientWidth,height:iframe.current.clientHeight}}));}catch(e){setError('Export failed: '+e.message);}finally{setExporting(false);}
 }
 return <article className="player-case" data-case-id={initial.id} style={{maxWidth:initial.viewport?.width}}>
  <div className="player-visualization">
  <iframe ref={iframe} className="player-frame" title={`Interactive visualization ${initial.id}`} sandbox="allow-scripts" srcDoc={srcdoc} style={{height:initial.height}}/>
  {onExport&&<button type="button" className="player-export" disabled={!rendered||!!error||exporting} onClick={exportCurrent}>{exporting?'Exporting…':'Export'}</button>}
  </div>
  {initial.sentences.length>0 ? <div className="player-sentences">{initial.sentences.map((sentence,i)=><p className="player-sentence" key={i}>{sentence.map((segment,j)=>{
    if(segment.type==='text')return <React.Fragment key={j}>{segment.text}</React.Fragment>;
    const widget=initial.widgets.find(w=>w.id===segment.widgetId);
    if(!widget || (widget.dependsOn && JSON.stringify(resolutions[widget.dependsOn.slotId])!==JSON.stringify(widget.dependsOn.equals)))return null;
    return <Widget key={j} spec={widget} value={widgetValue(widget)} onChange={value=>resolver.current(widget,value,widget.id)}/>;
  })}</p>)}</div> : <div className="player-widgets">{initial.widgets.filter(w=>!w.dependsOn||JSON.stringify(resolutions[w.dependsOn.slotId])===JSON.stringify(w.dependsOn.equals)).map(w=><Widget key={w.id} spec={w} value={widgetValue(w)} onChange={value=>resolver.current(w,value,w.id)}/>)}</div>}
  {error&&<p className="player-error" role="alert">{error}</p>}
 </article>;
}

import {createRoot} from 'react-dom/client';
import {useEffect,useRef,useState} from 'react';
import {VisualizationCanvas} from './Canvas.jsx';
import {publicCase} from './model.js';
import {downloadCase} from './export.js';
import './widgets/inline-widgets.css';
import './player.css';
const roots=new WeakMap();
function CaseSlot({example}){
 const ref=useRef(null),[visible,setVisible]=useState(false);
 useEffect(()=>{
  if(!('IntersectionObserver' in window)){setVisible(true);return;}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect();}
  },{rootMargin:'300px'});
  observer.observe(ref.current);return()=>observer.disconnect();
 },[]);
 return <div className="player-slot" ref={ref}>{visible ? <VisualizationCanvas example={example} onExport={downloadCase}/> : <article className="player-case"><div className="player-pending" style={{height:example.height}} aria-hidden="true"/></article>}</div>;
}

function mountCases(element,cases){
 if(!element)throw Error('A case container is required');
 const validated=cases.map(publicCase);
 if(new Set(validated.map(c=>c.id)).size!==validated.length)throw Error('Case IDs must be unique');
 let root=roots.get(element);if(!root){root=createRoot(element);roots.set(element,root);}
 root.render(validated.length ? validated.map(c=><CaseSlot key={c.id} example={c}/>) : <p className="case-empty">Examples will be added.</p>);
 return ()=>{root.unmount();roots.delete(element);};
}
window.ACME={mountCases};
const examples=window.ACME_CASES || [];
const dmGrid=document.getElementById('dm-case-grid');
const iwGrid=document.getElementById('iw-case-grid');
if(dmGrid && iwGrid){
 mountCases(dmGrid,examples.filter(c=>(c.modality || (c.dm?'DM':'IW'))==='DM'));
 mountCases(iwGrid,examples.filter(c=>(c.modality || (c.dm?'DM':'IW'))==='IW'));
} else if(examples.length && document.getElementById('case-grid')){
 mountCases(document.getElementById('case-grid'),examples);
}

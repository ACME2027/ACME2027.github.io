import {createRoot} from 'react-dom/client';
import {VisualizationCanvas} from './Canvas.jsx';
import {publicCase} from './model.js';
import './widgets/inline-widgets.css';
import './player.css';
const data={...window.ACME_CASE,renderCode:window.ACME_RENDER_CODE,config:window.ACME_CONFIG,data:window.ACME_DATA,dm:undefined,widgets:[],sentences:[],resolutions:{}};
createRoot(document.getElementById('case')).render(<VisualizationCanvas example={publicCase(data)}/>);

import React from 'react';
import {ContinuousSlider,StepSlider} from './widgets/NumericSlider';
import {DualHandleSlider} from './widgets/DualHandleSlider';
import {NumberInput} from './widgets/NumberInput';
import {TextInput} from './widgets/TextInput';
import {MultiSelect} from './widgets/MultiSelect';
import {SearchableSelect} from './widgets/SearchableSelect';
import {OrderedMultiSelect} from './widgets/OrderedMultiSelect';
export function Widget({spec,value,onChange}) {
 const c=spec.config, props={label:spec.label||'Value',inline:true,value:value??c.initialValue,onChange};
 const options=(c.options||[]).map((o,i)=>({...o,id:String(i)}));
 switch(spec.adapterId) {
  case 'iw.continuous-slider': return <ContinuousSlider {...c} {...props}/>;
  case 'iw.step-slider': return <StepSlider {...c} {...props}/>;
  case 'iw.dual-handle-slider': return <DualHandleSlider {...c} {...props}/>;
  case 'iw.number-input': return <NumberInput {...c} {...props}/>;
  case 'iw.text-input': return <TextInput {...c} {...props}/>;
  case 'iw.multi-select': return <MultiSelect {...props} value={props.value||[]} options={options}/>;
  case 'iw.ordered-multi-select': return <OrderedMultiSelect {...props} value={props.value||[]} options={options}/>;
  case 'iw.searchable-select': return <SearchableSelect {...props} value={props.value??null} options={options} placeholder={c.placeholder}/>;
  case 'iw.option-select': return <label className="player-native-widget"><select aria-label={props.label} value={Math.max(0,options.findIndex(o=>JSON.stringify(o.value)===JSON.stringify(props.value)))} onChange={e=>onChange(options[Number(e.target.value)].value)}>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>;
  case 'iw.color-picker': return <label className="player-native-widget"><input type="color" aria-label={props.label} value={props.value||'#3387b9'} onChange={e=>onChange(e.target.value)}/></label>;
  default: return <span role="alert">Unsupported inline widget: {spec.adapterId}</span>;
 }
}

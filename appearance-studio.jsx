import React,{useEffect,useRef,useState} from 'react';
import {LOOK_DEFAULTS} from './appearance.mjs';
import {HAIRSTYLES,BEARDS,BROWS,headCanvas} from './studio-head.mjs';
import {PixelPlayer} from './ui.jsx';
import {CELEBRATIONS} from './experience.mjs';

const SKINS=['#ebbd89','#f1d4b2','#bd8a61','#805b48','#583f34','#d4a275','#e3b8a2','#a17151'];
const HAIRS=['#302b24','#151b1a','#815135','#a97847','#c3a25e','#b8b9ad','#6e3927','#dabf87','#56636a','#755c79'];
const BOOTS=['#f47b28','#222c2d','#7ebfff','#b08ce0','#d1ed8a','#e7dfc7','#d65d60','#c49d48'];
const ACCESSORIES=['#d1ed8a','#e7dfc7','#222c2d','#89b2bd','#d65d60','#c49d48'];
const GROUPS=['short','short','curl','long','short','short','short','curl','tied','tied','tied','short','short','short','short','short','short','curl','tied','tied','tied','tied','tied','long'];
const pick=items=>items[Math.floor(Math.random()*items.length)];

function HeadOption({look,style,beard,onClick,selected,label}){
  const canvas=useRef(null);
  useEffect(()=>{const c=canvas.current,ctx=c?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,72,72);ctx.imageSmoothingEnabled=false;ctx.drawImage(headCanvas({...look,hairstyle:style??look.hairstyle,beard:beard??0,headband:false},false),0,0,72,72)},[look.skin,look.hair,look.highlights,look.highlight,look.brows,look.beardColor,style,beard,look.hairstyle]);
  return <button type="button" className="as-head-option" aria-label={label} aria-pressed={selected} onClick={onClick}><canvas ref={canvas} width="72" height="72"/><span>{label}</span></button>;
}

function Palette({label,value,colors,onChange}){return <div className="as-palette"><div className="as-label">{label}</div><div className="as-swatches">{colors.map(color=><button type="button" key={color} className="as-swatch" style={{background:color}} aria-label={`${label} ${color}`} aria-pressed={value.toLowerCase()===color} onClick={()=>onChange(color)}/>)}<label className="as-custom">自选<input aria-label={`自选${label}`} type="color" value={value} onChange={e=>onChange(e.target.value)}/></label></div></div>}

function Choice({label,items,value,onChange}){return <div className="as-choice"><div className="as-label">{label}</div><div className="as-chips">{items.map(([v,n])=><button type="button" key={v} aria-pressed={value===v} onClick={()=>onChange(v)}>{n}</button>)}</div></div>}

export function AppearanceStudio({team,name,number,position,look,onChange,children}){
  const [tab,setTab]=useState('hair'),[filter,setFilter]=useState('all'),[back,setBack]=useState(false),[history,setHistory]=useState([]);
  const a={...LOOK_DEFAULTS,...look,studio:1},original=useRef(look),set=changes=>{setHistory(h=>[...h.slice(-19),look]);onChange({...look,studio:1,...changes})};
  const reset=()=>{setHistory(h=>[...h.slice(-19),look]);onChange({...original.current,studio:1})};
  const random=()=>set({hairstyle:Math.floor(Math.random()*HAIRSTYLES.length),hair:pick(HAIRS.slice(0,7)),skin:pick(SKINS),beard:pick([0,0,1,2,4,5]),brows:Math.floor(Math.random()*BROWS.length),highlights:false,headband:Math.random()<.2,bandStyle:0,accessoryColor:pick(ACCESSORIES.slice(0,4)),shoes:pick(BOOTS)});
  return <div className="appearance-studio-v2">
    <div className="as-intro"><div><strong>让他一眼就是你</strong><p>挑选你的球场形象。每一次改变，都在这里看得见。</p></div><button type="button" onClick={random}>试试一套新搭配</button></div>
    <div className="as-layout"><nav className="as-rail" aria-label="外观分类">{[['hair','头发'],['face','面容'],['kit','装备'],['identity','身份']].map(([id,label])=><button type="button" key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}<p>你的外观会跟随你出现在球场与生涯档案中。</p></nav>
      <div className="as-preview-column"><div className="as-preview"><div className="as-preview-top"><span>● 实时预览</span><span>{team?.name}</span></div><div className="as-stage"><PixelPlayer team={team} number={number} appearance={a} back={back}/></div><div className="as-direction"><button type="button" aria-pressed={!back} onClick={()=>setBack(false)}>正面</button><button type="button" aria-pressed={back} onClick={()=>setBack(true)}>背面</button></div><div className="as-identity"><strong>{name} · {number}</strong><small>{position==='forward'?'前锋':position==='midfielder'?'中场':'后卫'} / {team?.name}</small></div></div><div className="as-field-size"><span>球场上的你<small>实际比赛尺寸</small></span><PixelPlayer team={team} number={number} appearance={a} back={back}/></div></div>
      <section className="as-options" aria-label="外观选项">
        {tab==='hair'&&<><h3>选择发型 <small>{HAIRSTYLES.length} 种外观</small></h3><p>先选轮廓，再选发色。点击小人，马上试穿。</p><div className="as-filters">{[['all','全部'],['short','短发'],['curl','卷发'],['long','长发'],['tied','扎发与辫子']].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div><div className="as-head-grid">{HAIRSTYLES.map((label,i)=>(filter==='all'||GROUPS[i]===filter)&&<HeadOption key={i} look={a} style={i} selected={a.hairstyle===i} label={label} onClick={()=>set({hairstyle:i})}/>)}</div><small className="as-scroll-hint">向下滚动，查看更多发型</small><Palette label="发色" value={a.hair} colors={HAIRS} onChange={hair=>set({hair})}/><label className="as-check"><input type="checkbox" checked={a.highlights} onChange={e=>set({highlights:e.target.checked})}/>局部挑染</label>{a.highlights&&<Palette label="挑染颜色" value={a.highlight} colors={['#d2ad63','#e7dfc7','#d65d60','#89b2bd']} onChange={highlight=>set({highlight})}/>}</>}
        {tab==='face'&&<><h3>面容与胡须 <small>自由组合</small></h3><p>用清晰的像素轮廓塑造你的面容。</p><Palette label="肤色" value={a.skin} colors={SKINS} onChange={skin=>set({skin})}/><div className="as-label">胡须</div><div className="as-head-grid as-beard-grid">{BEARDS.map((label,i)=><HeadOption key={i} look={a} style={a.hairstyle} beard={i} selected={a.beard===i} label={label} onClick={()=>set({beard:i})}/>)}</div><Choice label="眉形" items={BROWS.map((n,i)=>[i,n])} value={a.brows??0} onChange={brows=>set({brows})}/></>}
        {tab==='kit'&&<><h3>球场装备</h3><p>球队球衣搭配你自己的装备细节。</p><label className="as-check"><input type="checkbox" checked={a.headband} onChange={e=>set({headband:e.target.checked})}/>佩戴发带</label><Choice label="发带样式" items={[[0,'细发带'],[1,'宽发带'],[2,'扎结发带']]} value={a.bandStyle??0} onChange={bandStyle=>set({bandStyle,headband:true})}/><Choice label="护腕位置" items={[["none","未佩戴"],["left","左侧"],["right","右侧"],["both","双侧"]]} value={a.wrist} onChange={wrist=>set({wrist})}/><Choice label="球袜长度" items={[["short","短袜"],["normal","常规"],["high","高筒"]]} value={a.sockLength} onChange={sockLength=>set({sockLength})}/><Palette label="球袜颜色" value={a.sockColor} colors={['#eef3dc','#e9c64a','#7ebfff','#d65d60']} onChange={sockColor=>set({sockColor})}/><Palette label="配饰颜色" value={a.accessoryColor} colors={ACCESSORIES} onChange={accessoryColor=>set({accessoryColor})}/><Palette label="球鞋配色" value={a.shoes} colors={BOOTS} onChange={shoes=>set({shoes})}/><Palette label="球鞋细节" value={a.bootAccent} colors={['#252d3a','#e7dfc7','#d1ed8a','#7ebfff']} onChange={bootAccent=>set({bootAccent})}/><Choice label="袖型" items={[["short","短袖"],["long","长袖"],["band","经典袖带"]]} value={a.sleeve} onChange={sleeve=>set({sleeve})}/><Choice label="体型轮廓" items={[["slim","精瘦"],["standard","标准"],["broad","宽肩"]]} value={a.build} onChange={build=>set({build})}/><Choice label="庆祝动作" items={CELEBRATIONS.map((label,i)=>[i,label])} value={a.celebration} onChange={celebration=>set({celebration})}/></>}
        {tab==='identity'&&<><h3>球员身份</h3><p>球衣背后的名字与号码，属于你。</p><div className="as-summary"><strong>{name} · {number} 号</strong><span>{team?.name}</span></div><p>姓名、号码与踢法在下方原有的生涯设置中修改，外观不影响能力。</p>{children}</>}
      </section></div>
    <div className="as-footer"><span>正面、背面和球场预览同步更新；保存请使用下方生涯按钮。</span><div><button type="button" disabled={!history.length} onClick={()=>{onChange(history.at(-1));setHistory(h=>h.slice(0,-1))}}>撤销</button><button type="button" onClick={reset}>恢复原样</button></div></div>
  </div>;
}

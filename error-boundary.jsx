import React from 'react';

export class AppErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={failed:false}}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error){console.error('Pixel Pitch render error:',error)}
  render(){return this.state.failed?<main role="alert" style={{maxWidth:720,margin:'12vh auto',padding:32,color:'#f1eee4',background:'#17252b',border:'1px solid #40545a',fontFamily:'system-ui,sans-serif'}}><p style={{color:'#caff70',letterSpacing:2}}>PIXEL PITCH / ERROR</p><h1>页面遇到问题</h1><p>已完成的存档进度仍保存在本地。正在进行的比赛可能无法恢复。</p><button onClick={()=>window.location.reload()} style={{padding:'10px 16px',cursor:'pointer'}}>重新载入页面</button></main>:this.props.children}
}

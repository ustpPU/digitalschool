import React from 'react';
import {RefreshCw} from 'lucide-react';
export default class AppErrorBoundary extends React.Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error){console.error('PU Insight: paparan tidak dapat dimuatkan.',error)}
  render(){
    if(this.state.failed)return <main className="app-recovery" role="alert"><div><h1>Paparan belum dapat dibuka</h1><p>Muat semula untuk mendapatkan versi terkini PU Insight.</p><button className="primary" onClick={()=>window.location.reload()}><RefreshCw size={17}/> Muat semula</button><a href={import.meta.env.BASE_URL}>Kembali ke gambaran daerah</a></div></main>;
    return this.props.children;
  }
}

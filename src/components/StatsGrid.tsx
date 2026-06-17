import React from 'react'

function StatCard({label,value}:{label:string,value:string}){
  return (
    <div style={{background:'var(--color-citra-orange)',borderRadius:'var(--radius-cards)',padding:20,color:'var(--color-paper-white)',minWidth:180}}>
      <div style={{fontFamily:'var(--font-sans-serif)',fontSize:14}}>{label}</div>
      <div style={{fontFamily:'var(--font-pp-neue-corp-compact)',fontSize:'var(--text-heading)',fontWeight:700}}>{value}</div>
    </div>
  )
}

export default function StatsGrid(){
  const stats = [
    {label:'Total Value', value:'$12.4M'},
    {label:'Active Users', value:'24.1k'},
    {label:'Chains', value:'12'},
    {label:'Integrations', value:'8'}
  ]
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,maxWidth:1100,margin:'0 auto'}}>
      {stats.map(s=> <StatCard key={s.label} label={s.label} value={s.value} />)}
    </div>
  )
}

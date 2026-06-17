import React from 'react'

export default function BlogCard({title,tag}:{title:string,tag:string}){
  return (
    <article className="rounded-40" style={{background:'var(--color-cream-card)',width:320,padding:24,border:'1px solid rgba(7,6,7,0.04)'}}>
      <div style={{height:180,borderRadius:28,overflow:'hidden',marginBottom:12}}>
        <div style={{width:'100%',height:'100%',background:'linear-gradient(90deg,var(--color-citra-orange),var(--color-ion-violet))'}} />
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
        <span style={{background:'var(--color-hazard-yellow)',padding:'3px 8px',borderRadius:20,fontSize:12}}> {tag} </span>
      </div>
      <h3 style={{fontFamily:'var(--font-pp-neue-corp-compact)',fontSize:26,lineHeight:1.1,color:'var(--color-ink)',margin:'6px 0'}}>{title}</h3>
      <div style={{fontFamily:'var(--font-sans-serif)',fontSize:14,color:'rgba(7,6,7,0.7)'}}>Jun 17, 2026</div>
    </article>
  )
}

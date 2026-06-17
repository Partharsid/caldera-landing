import React from 'react'

export default function LogoStrip(){
  const logos = new Array(6).fill(0)
  return (
    <div style={{background:'var(--color-paper-white)',borderRadius:'var(--radius-cards)',padding:16}}>
      <div style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between'}}>
        {logos.map((_,i)=> (
          <div key={i} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:12}}>
            <div style={{width:120,height:36,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="100" height="28" viewBox="0 0 100 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <rect width="100" height="28" fill="#fff" />
                <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#070607" fontSize="10">Logo</text>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

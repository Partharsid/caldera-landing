"use client"
import React, { useEffect, useRef } from 'react'
import HalftonePanel from './HalftonePanel'

export default function Hero(){
  const ref = useRef<HTMLHeadingElement | null>(null)
  useEffect(()=>{
    const el = ref.current
    if(el){
      el.classList.add('hero-entrance')
      setTimeout(()=>el.classList.add('in'),900)
    }
  },[])

  return (
    <>
      <div style={{display:'flex',flexDirection:'column',gap:24}}>
        <h1 ref={ref} className="hero-headline" style={{fontSize:'var(--text-display)',maxWidth:520}}>CALDERA
        </h1>
        <p style={{fontFamily:'var(--font-sans-serif)',fontSize:'var(--text-body)',lineHeight:1.5,maxWidth:520}}>A risograph zine on warm concrete — brutalist editorial crypto voice, halftone brand panels, and a single incandescent orange.</p>
        <div style={{display:'flex',gap:12}}>
          <button className="citra-btn">Get Started</button>
          <button className="ghost-btn">Explore</button>
        </div>
      </div>

      <div style={{justifySelf:'end'}}>
        <HalftonePanel />
      </div>
    </>
  )
}

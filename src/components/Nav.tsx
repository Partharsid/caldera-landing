"use client"
import React from 'react'
import Link from 'next/link'

export default function Nav(){
  return (
    <div style={{width:'100%',display:'flex',justifyContent:'center',position:'sticky',top:20,zIndex:40}}>
      <nav className="nav-pill" role="navigation" aria-label="Main navigation">
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect width="24" height="24" rx="6" fill="var(--color-citra-orange)" />
            <circle cx="12" cy="12" r="5" fill="var(--color-paper-white)" />
          </svg>
          <span style={{fontFamily:'var(--font-sans-serif)',fontWeight:500}}>Caldera</span>
        </div>

        <div style={{display:'flex',gap:18,alignItems:'center',marginLeft:24,marginRight:12}}>
          <Link href="#">Product</Link>
          <Link href="#">Docs</Link>
          <Link href="#">Blog</Link>
        </div>

        <div style={{marginLeft:12}}>
          <button className="citra-btn" aria-label="Get started">Get Started</button>
        </div>
      </nav>
    </div>
  )
}

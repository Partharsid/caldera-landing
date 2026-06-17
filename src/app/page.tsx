import React from 'react'
import Hero from '../components/Hero'
import StatsGrid from '../components/StatsGrid'
import BlogCarousel from '../components/BlogCarousel'
import LogoStrip from '../components/LogoStrip'

export default function Page(){
  return (
    <div style={{display:'grid',gap:'80px',paddingBottom:80}}>
      <section style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:32,alignItems:'center'}} className="hero-grid">
        <Hero />
      </section>

      <section aria-labelledby="stats">
        <StatsGrid />
      </section>

      <section aria-labelledby="blog">
        <BlogCarousel />
      </section>

      <section>
        <LogoStrip />
      </section>
    </div>
  )
}

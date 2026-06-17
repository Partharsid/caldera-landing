import React from 'react'
import BlogCard from './BlogCard'

export default function BlogCarousel(){
  const posts = [
    {title:'Announcing Caldera', tag:'Announcement'},
    {title:'Halftone Art Practices', tag:'Design'},
    {title:'Building on Caldera', tag:'Integration'}
  ]
  return (
    <div style={{overflowX:'auto',display:'flex',gap:16,paddingBottom:8}} aria-label="Blog carousel">
      {posts.map(p=> <BlogCard key={p.title} title={p.title} tag={p.tag} />)}
    </div>
  )
}

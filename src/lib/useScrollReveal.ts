import { useEffect } from 'react'

export default function useScrollReveal(selector = '.reveal', rootMargin = '0px 0px -10% 0px'){
  useEffect(()=>{
    if(typeof window === 'undefined') return
    const els = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    const io = new IntersectionObserver((entries)=>{
      entries.forEach((entry,i)=>{
        if(entry.isIntersecting){
          entry.target.classList.add('in')
          io.unobserve(entry.target)
        }
      })
    },{rootMargin})
    els.forEach(el=> io.observe(el))
    return ()=> io.disconnect()
  },[selector,rootMargin])
}

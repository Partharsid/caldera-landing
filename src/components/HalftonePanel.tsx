"use client"
import React from 'react'

type Props = { width?: number | string; height?: number | string };

export default function HalftonePanel({ width = '100%', height = 520 }: Props){
  // SVG halftone: a radial dot pattern mask over a linear gradient
  return (
    <div className="halftone-panel" style={{width,height}} aria-hidden>
      <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--color-citra-orange)" />
            <stop offset="100%" stopColor="var(--color-ion-violet)" />
          </linearGradient>

          <pattern id="dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2" fill="white" />
          </pattern>

          <mask id="maskDots">
            <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
          </mask>
        </defs>

        <rect x="0" y="0" width="100%" height="100%" fill="url(#g)" />
        <rect x="0" y="0" width="100%" height="100%" fill="black" mask="url(#maskDots)" opacity="0.35" />
      </svg>
    </div>
  )
}

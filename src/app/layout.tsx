import './globals.css'
import React from 'react'
import Nav from '../components/Nav'
import { Providers } from './providers'

export const metadata = {
  title: 'Caldera — Landing',
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en">
      <body style={{ background: 'var(--color-concrete-canvas)' }}>
        <Providers>
          <Nav />
          <main className="caldera-container" style={{paddingTop:32}}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}

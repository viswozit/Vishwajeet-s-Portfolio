import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Viswozit | Architecture, Construction & AI',description:'From architecture to construction management: the professional journey of Viswozit and an exploration of AI in construction.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}

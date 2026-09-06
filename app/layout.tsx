import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Vishwajeet Patil | Construction Management & Project Engineering',
  description: 'Vishwajeet Unmesh Patil: ASU construction management graduate student and FILANC Project Engineer Intern. Water infrastructure, project controls, QA/QC, BIM, and mission-critical facilities.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}

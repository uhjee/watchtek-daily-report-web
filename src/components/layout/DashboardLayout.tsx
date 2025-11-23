'use client'

import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header sidebarCollapsed={false} />
      <main
        className="transition-all duration-300 ml-64 p-6"
      >
        {children}
      </main>
    </div>
  )
}

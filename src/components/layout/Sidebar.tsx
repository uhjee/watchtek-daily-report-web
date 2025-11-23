'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '보고서 생성', href: '/reports', icon: FileText },
  { name: '보고서 기록', href: '/history', icon: Calendar },
  { name: '설정', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            <span className="font-bold text-lg">Watchtek</span>
          </Link>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
              {!collapsed && (
                <span className={cn('font-medium text-sm', isActive && 'font-semibold')}>
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-soft hover:shadow-soft-lg transition-shadow"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Footer */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">큐브 파트</p>
            <p>v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}

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
  ListTodo,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '금일 업무 현황', href: '/reports', icon: FileText },
  { name: '월별 업무 목록', href: '/monthly-tasks', icon: ListTodo },
  { name: '보고서 기록', href: '/history', icon: Calendar },
  { name: '설정', href: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-32'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-border">
        <Link href="/" className="flex items-center justify-center">
          <div className={cn(
            'rounded-lg bg-primary flex items-center justify-center',
            collapsed ? 'w-8 h-8' : 'w-10 h-10'
          )}>
            <span className={cn(
              'text-primary-foreground font-bold',
              collapsed ? 'text-sm' : 'text-base'
            )}>W</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center'
              )}
              title={item.name}
            >
              <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
              {!collapsed && (
                <span className={cn('font-medium text-xs truncate', isActive && 'font-semibold')}>
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={onToggle}
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
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground text-center">
            <p className="font-medium truncate">큐브 파트</p>
            <p className="text-[9px]">v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}

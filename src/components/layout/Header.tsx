'use client'

import { Bell, Moon, Sun, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState, useSyncExternalStore } from 'react'

interface HeaderProps {
  sidebarCollapsed?: boolean
}

// 테마 상태를 외부 스토어로 관리
function getThemeSnapshot() {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}

export function Header({ sidebarCollapsed = false }: HeaderProps) {
  const isDarkFromStore = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => true // 서버 사이드에서 기본값 dark
  )
  const [isDark, setIsDark] = useState(isDarkFromStore)

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.classList.toggle('dark', newIsDark)
  }

  return (
    <header
      className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border"
      style={{
        marginLeft: sidebarCollapsed ? '64px' : '128px',
        width: sidebarCollapsed ? 'calc(100% - 64px)' : 'calc(100% - 128px)',
        transition: 'margin-left 0.3s, width 0.3s',
      }}
    >
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-foreground">
            큐브파트 관리
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg hover:bg-muted"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-muted relative"
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2 rounded-lg hover:bg-muted flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium hidden sm:inline-block">관리자</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">관리자</p>
                  <p className="text-xs text-muted-foreground">admin@watchtek.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>프로필</DropdownMenuItem>
              <DropdownMenuItem>설정</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">로그아웃</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

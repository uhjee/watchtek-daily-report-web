'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardLayout } from '@/components/layout'
import {
  FileText,
  Calendar,
  TrendingUp,
  ArrowRight,
  Clock,
  Users,
} from 'lucide-react'

// Quick Action Card
function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  variant = 'primary',
}: {
  title: string
  description: string
  icon: React.ElementType
  href: string
  variant?: 'primary' | 'success' | 'info' | 'warning'
}) {
  const iconStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#1ee0ac]/10 text-[#1ee0ac]',
    info: 'bg-[#09c2de]/10 text-[#09c2de]',
    warning: 'bg-[#f4bd0e]/10 text-[#f4bd0e]',
  }

  return (
    <Link href={href}>
      <Card className="shadow-soft hover:shadow-soft-lg transition-all duration-200 cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Stat Card for Dashboard
function DashStatCard({
  title,
  value,
  change,
  icon: Icon,
  variant = 'primary',
}: {
  title: string
  value: string
  change?: string
  icon: React.ElementType
  variant?: 'primary' | 'success' | 'info' | 'warning'
}) {
  const borderStyles = {
    primary: 'border-l-primary',
    success: 'border-l-[#1ee0ac]',
    info: 'border-l-[#09c2de]',
    warning: 'border-l-[#f4bd0e]',
  }

  const iconStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#1ee0ac]/10 text-[#1ee0ac]',
    info: 'bg-[#09c2de]/10 text-[#09c2de]',
    warning: 'bg-[#f4bd0e]/10 text-[#f4bd0e]',
  }

  return (
    <Card className={`border-l-4 ${borderStyles[variant]} shadow-soft`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change && (
              <p className="text-xs text-[#1ee0ac] mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {change}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconStyles[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">안녕하세요! 👋</h1>
          <p className="text-white/80 mt-2">
            와치텍 큐브파트 보고서 관리 시스템에 오신 것을 환영합니다.
          </p>
          <div className="mt-4">
            <Link href="/reports">
              <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
                보고서 생성하기
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashStatCard
            title="이번 주 보고서"
            value="5"
            change="+2 from last week"
            icon={FileText}
            variant="primary"
          />
          <DashStatCard
            title="총 참여 인원"
            value="12"
            icon={Users}
            variant="success"
          />
          <DashStatCard
            title="이번 달 공수"
            value="384m/h"
            change="+12% growth"
            icon={Clock}
            variant="info"
          />
          <DashStatCard
            title="예정된 보고서"
            value="3"
            icon={Calendar}
            variant="warning"
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">빠른 작업</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickActionCard
              title="일일 보고서 생성"
              description="오늘의 진행/예정 업무를 자동으로 수집하여 보고서를 생성합니다."
              icon={FileText}
              href="/reports"
              variant="primary"
            />
            <QuickActionCard
              title="보고서 기록 조회"
              description="과거에 생성된 보고서를 조회하고 관리합니다."
              icon={Calendar}
              href="/history"
              variant="info"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">최근 활동</h3>
            <div className="space-y-4">
              {[
                { action: '일일 보고서 생성', time: '오늘 09:00', status: 'success' },
                { action: '주간 보고서 생성', time: '어제 18:00', status: 'success' },
                { action: '일일 보고서 생성', time: '어제 09:00', status: 'success' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#1ee0ac]" />
                    <span className="text-sm">{item.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

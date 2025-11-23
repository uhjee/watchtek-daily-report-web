import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>와치텍 큐브파트 보고서 시스템</CardTitle>
          <CardDescription>
            Notion 기반 자동 보고서 생성 및 관리
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/reports">
            <Button className="w-full" size="lg">
              보고서 페이지로 이동
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}

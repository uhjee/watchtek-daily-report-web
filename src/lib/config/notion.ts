import { Client } from '@notionhq/client'

/**
 * Notion API 클라이언트를 초기화합니다.
 * API 키가 없는 경우 오류를 발생시킵니다.
 */
function createNotionClient(): Client {
  if (!process.env.NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY가 환경 변수에 정의되지 않았습니다.')
  }

  return new Client({
    auth: process.env.NOTION_API_KEY,
  })
}

export const notionClient = createNotionClient()

export const notionConfig = {
  databaseId: process.env.NOTION_DATABASE_ID || '',
  reportDatabaseId: process.env.NOTION_REPORT_DATABASE_ID || '',
}

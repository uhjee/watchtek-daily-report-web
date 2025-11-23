import { notionClient, notionConfig } from '../config/notion'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints'

/**
 * Notion API 호출을 담당하는 서비스
 * 데이터베이스 조회 및 페이지 생성 기능 제공
 */
export class NotionApiService {
  private databaseId: string
  private reportDatabaseId: string

  constructor() {
    if (!notionConfig.databaseId) {
      throw new Error('NOTION_DATABASE_ID가 환경 변수에 정의되지 않았습니다.')
    }
    if (!notionConfig.reportDatabaseId) {
      throw new Error('NOTION_REPORT_DATABASE_ID가 환경 변수에 정의되지 않았습니다.')
    }

    this.databaseId = notionConfig.databaseId
    this.reportDatabaseId = notionConfig.reportDatabaseId
  }

  /**
   * Notion 데이터베이스를 조회하고 필터링된 결과를 반환한다
   */
  async queryDatabase(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter?: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sorts?: any,
    startCursor?: string
  ) {
    try {
      const response = await notionClient.databases.query({
        database_id: this.databaseId,
        filter: filter,
        sorts: sorts,
        start_cursor: startCursor,
        page_size: 100,
      })

      return response
    } catch (error) {
      console.error('Notion 데이터베이스 조회 중 오류 발생:', error)
      throw error
    }
  }

  /**
   * 모든 데이터베이스 결과를 페이지네이션하여 조회한다
   */
  async queryDatabaseAll(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter?: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sorts?: any
  ): Promise<unknown[]> {
    const allResults: unknown[] = []
    let hasMore = true
    let startCursor: string | undefined = undefined

    while (hasMore) {
      const response = await this.queryDatabase(filter, sorts, startCursor)
      allResults.push(...response.results)

      hasMore = response.has_more
      startCursor = response.next_cursor ?? undefined
    }

    return allResults
  }

  /**
   * Notion 보고서 데이터베이스에 새로운 페이지를 생성한다
   * @param properties - 페이지 속성
   * @param children - 페이지 내용 (블록 배열)
   * @param icon - 페이지 아이콘
   * @returns 생성된 페이지
   */
  async createPage(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: any,
    children: BlockObjectRequest[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon?: any
  ) {
    try {
      const response = await notionClient.pages.create({
        parent: {
          database_id: this.reportDatabaseId,
        },
        properties,
        children,
        icon,
      })

      return response
    } catch (error) {
      console.error('Notion 페이지 생성 중 오류 발생:', error)
      throw error
    }
  }

  /**
   * 기존 페이지에 블록들을 추가한다
   * @param pageId - 페이지 ID
   * @param children - 추가할 블록 배열
   * @returns 추가된 블록들
   */
  async appendBlocks(pageId: string, children: BlockObjectRequest[]) {
    try {
      const response = await notionClient.blocks.children.append({
        block_id: pageId,
        children,
      })

      return response
    } catch (error) {
      console.error('Notion 블록 추가 중 오류 발생:', error)
      throw error
    }
  }
}

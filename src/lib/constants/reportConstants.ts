/**
 * 보고서 관련 상수
 */

export const TEXT_LIMITS = {
  /**
   * Notion 블록 내 텍스트의 최대 길이
   * https://developers.notion.com/reference/request-limits
   */
  NOTION_BLOCK_MAX_LENGTH: 2000,
}

export const BLOCK_LIMITS = {
  /**
   * Notion API의 단일 요청당 최대 블록 수
   * https://developers.notion.com/reference/request-limits
   */
  NOTION_MAX_BLOCKS_PER_REQUEST: 100,
}

import { TEXT_LIMITS } from '../constants/reportConstants'

/**
 * 텍스트를 지정된 길이로 나누어 배열로 반환한다
 * @param text - 나눌 텍스트
 * @param chunkSize - 각 청크의 최대 크기 (기본값: 2000)
 * @returns 나누어진 텍스트 배열
 */
export const splitTextIntoChunks = (
  text: string,
  chunkSize: number = TEXT_LIMITS.NOTION_BLOCK_MAX_LENGTH
): string[] => {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}

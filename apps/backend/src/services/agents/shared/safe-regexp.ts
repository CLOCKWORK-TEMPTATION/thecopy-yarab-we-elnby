/**
 * Safe RegExp Utilities
 * دوال آمنة للتعامل مع التعبيرات النمطية لتجنب ReDoS attacks
 */

import { logger } from '@/lib/logger';

/**
 * Count occurrences of a term safely
 * عد مرات ظهور مصطلح بشكل آمن
 */
export function safeCountOccurrences(text: string, term: string): number {
  if (!text || !term) return 0;
  
  try {
    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedTerm, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  } catch (error) {
    logger.error('Error in safeCountOccurrences', { error });
    return 0;
  }
}

/**
 * Count occurrences of multiple terms safely
 * عد مرات ظهور عدة مصطلحات بشكل آمن
 */
export function safeCountMultipleTerms(
  text: string,
  terms: string[]
): Record<string, number> {
  if (!text || !terms || terms.length === 0) return {};

  const counts: Record<string, number> = {};

  for (const term of terms) {
    counts[term] = safeCountOccurrences(text, term);
  }

  return counts;
}

/**
 * Sum all counts from a count record
 * جمع جميع العدادات من سجل العدادات
 */
export function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/**
 * Check if text matches a pattern safely
 * التحقق من تطابق النص مع نمط بشكل آمن
 */
export function safeMatch(text: string, pattern: string | RegExp): boolean {
  if (!text) return false;
  
  try {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern, 'i') 
      : pattern;
    return regex.test(text);
  } catch (error) {
    logger.error('Error in safeMatch', { error });
    return false;
  }
}

/**
 * Extract matches safely with a limit
 * استخراج التطابقات بشكل آمن مع حد أقصى
 */
export function safeExtractMatches(
  text: string,
  pattern: string | RegExp,
  maxMatches: number = 100
): string[] {
  if (!text) return [];
  
  try {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern, 'gi') 
      : new RegExp(pattern.source, 'gi');
    
    const matches: string[] = [];
    let match;
    let count = 0;
    
    while ((match = regex.exec(text)) !== null && count < maxMatches) {
      matches.push(match[0]);
      count++;
      
      // Prevent infinite loops
      if (regex.lastIndex === match.index) {
        regex.lastIndex++;
      }
    }
    
    return matches;
  } catch (error) {
    logger.error('Error in safeExtractMatches', { error });
    return [];
  }
}

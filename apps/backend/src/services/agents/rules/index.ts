/**
 * Rules Registry
 * Central registry for all constitutional rules
 */

import { constitutionalRulesEngine } from '../shared/constitutionalRules';
import { characterRules } from './characterRules';
import { dialogueRules } from './dialogueRules';
import { plotRules } from './plotRules';

/**
 * Initialize all rules
 */
export function initializeRules(): void {
  // Register all domain-specific rules
  constitutionalRulesEngine.registerRules([
    ...characterRules,
    ...dialogueRules,
    ...plotRules,
  ]);
}

/**
 * Get rules by domain
 */
export function getRulesByDomain(domain: 'character' | 'dialogue' | 'plot') {
  return constitutionalRulesEngine.getRulesByCategory(domain);
}

/**
 * Export all rule collections
 */
export {
  characterRules,
  dialogueRules,
  plotRules,
};

/**
 * Export the engine
 */
export { constitutionalRulesEngine };

// Auto-initialize on import
initializeRules();

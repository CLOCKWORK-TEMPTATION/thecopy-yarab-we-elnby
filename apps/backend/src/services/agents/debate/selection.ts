/**
 * اختيار الوكلاء للمناظرة - Agent Selection for Debates
 * 
 * @module selection
 * @description
 * يوفر وظائف لاختيار وتعيين أدوار الوكلاء في المناظرة.
 * جزء من المرحلة 3 - نظام المناظرة متعدد الوكلاء
 */

import { logger } from '@/lib/logger';

import { TaskType } from '../core/enums';
import { BaseAgent } from '../shared/BaseAgent';

import { DebateConfig, DebateParticipant, DebateRole } from './types';


/**
 * اختيار الوكلاء المشاركين في المناظرة
 * 
 * @description
 * يختار الوكلاء المناسبين من القائمة المتاحة ويعين لهم أدواراً
 * 
 * @param availableAgents - الوكلاء المتاحون
 * @param config - إعدادات المناظرة (اختياري)
 * @returns قائمة المشاركين مع أدوارهم
 * @throws خطأ إذا لم يكن هناك وكلاء متاحون
 */
export function selectDebatingAgents(
  availableAgents: BaseAgent[],
  config?: Partial<DebateConfig>
): DebateParticipant[] {
  logger.info("اختيار الوكلاء للمناظرة", { availableCount: availableAgents.length });

  if (availableAgents.length === 0) {
    throw new Error('لا توجد وكلاء متاحة للمناظرة');
  }

  const maxParticipants = config?.maxParticipants || 5;
  const minParticipants = config?.minParticipants || 2;

  // اختيار الوكلاء وتعيين الأدوار

  // 1. موازنة أنواع الوكلاء
  const balancedAgents = balanceAgentTypes(availableAgents, maxParticipants);

  // 2. تجنب التكرار (عدم اختيار وكلاء متعددين من نفس النوع)
  const uniqueAgents = avoidRedundancy(balancedAgents);

  // 3. تعيين الأدوار للوكلاء المختارين
  const agentsWithRoles = assignRoles(uniqueAgents);

  // 4. ضمان الحد الأدنى من المشاركين
  if (agentsWithRoles.length < minParticipants) {
    logger.warn("عدد الوكلاء المختارين أقل من الحد الأدنى", {
      selected: agentsWithRoles.length,
      minimum: minParticipants,
    });

    // إضافة وكلاء إضافيين إذا كانوا متاحين
    const remainingAgents = availableAgents.filter(
      agent => !agentsWithRoles.some(p => p.agent === agent)
    );

    while (
      agentsWithRoles.length < minParticipants &&
      remainingAgents.length > 0
    ) {
      const agent = remainingAgents.shift()!;
      agentsWithRoles.push({
        agent,
        role: DebateRole.OPPONENT,
        voteWeight: 1.0,
      });
    }
  }

  // 5. تحديد العدد الأقصى للمشاركين
  const finalParticipants = agentsWithRoles.slice(0, maxParticipants);

  logger.info("تم اختيار الوكلاء للمناظرة", { count: finalParticipants.length });

  return finalParticipants;
}

/**
 * تعيين الأدوار للوكلاء
 * 
 * @description
 * يعين دوراً مناسباً لكل وكيل بناءً على خصائصه
 * 
 * @param agents - مصفوفة الوكلاء
 * @returns مصفوفة المشاركين مع أدوارهم
 */
export function assignRoles(agents: BaseAgent[]): DebateParticipant[] {
  logger.debug("تعيين الأدوار للوكلاء", { count: agents.length });

  const participants: DebateParticipant[] = [];

  if (agents.length === 0) {
    return participants;
  }

  // First agent is the proposer
  const firstAgent = agents[0];
  if (firstAgent) {
    participants.push({
      agent: firstAgent,
      role: DebateRole.PROPOSER,
      voteWeight: 1.0,
    });
  }

  // Second agent is the opponent (if exists)
  const secondAgent = agents[1];
  if (secondAgent) {
    participants.push({
      agent: secondAgent,
      role: DebateRole.OPPONENT,
      voteWeight: 1.0,
    });
  }

  // Last agent is the synthesizer (if 3+ agents)
  const lastAgent = agents[agents.length - 1];
  if (agents.length > 2 && lastAgent) {
    participants.push({
      agent: lastAgent,
      role: DebateRole.SYNTHESIZER,
      voteWeight: 1.2, // Higher weight for synthesizer
    });

    // Middle agents are additional opponents or moderators
    for (let i = 2; i < agents.length - 1; i++) {
      const agent = agents[i];
      if (agent) {
        participants.push({
          agent,
          role: i % 2 === 0 ? DebateRole.OPPONENT : DebateRole.MODERATOR,
          voteWeight: 1.0,
        });
      }
    }
  }

  return participants;
}

/**
 * موازنة أنواع الوكلاء لتحقيق التنوع
 * 
 * @description
 * يختار مزيجاً متوازناً من الوكلاء التحليليين والإبداعيين والمتكاملين
 * 
 * @param agents - مصفوفة الوكلاء
 * @param maxCount - الحد الأقصى لعدد الوكلاء
 * @returns مصفوفة الوكلاء المتوازنة
 */
export function balanceAgentTypes(
  agents: BaseAgent[],
  maxCount: number
): BaseAgent[] {
  logger.debug("موازنة أنواع الوكلاء", { maxCount });

  if (agents.length <= maxCount) {
    return agents;
  }

  // تصنيف الوكلاء حسب نوع المهمة
  const analyticAgents: BaseAgent[] = [];
  const creativeAgents: BaseAgent[] = [];
  const integratedAgents: BaseAgent[] = [];
  const otherAgents: BaseAgent[] = [];

  agents.forEach(agent => {
    const config = agent.getConfig();
    const taskType = config.taskType;

    if (isAnalyticTask(taskType)) {
      analyticAgents.push(agent);
    } else if (isCreativeTask(taskType)) {
      creativeAgents.push(agent);
    } else if (
      taskType === TaskType.INTEGRATED ||
      taskType === TaskType.RECOMMENDATIONS_GENERATOR
    ) {
      integratedAgents.push(agent);
    } else {
      otherAgents.push(agent);
    }
  });

  // اختيار مزيج متوازن
  const balanced: BaseAgent[] = [];
  const slotsPerCategory = Math.floor(maxCount / 3);

  // الأخذ من كل فئة
  balanced.push(...analyticAgents.slice(0, slotsPerCategory));
  balanced.push(...creativeAgents.slice(0, slotsPerCategory));
  balanced.push(...integratedAgents.slice(0, slotsPerCategory));

  // ملء الفتحات المتبقية بالآخرين
  const remaining = maxCount - balanced.length;
  if (remaining > 0) {
    balanced.push(...otherAgents.slice(0, remaining));
  }

  // إذا لم يكن كافياً، أضف المزيد من أي فئة
  if (balanced.length < maxCount) {
    const allRemaining = [
      ...analyticAgents.slice(slotsPerCategory),
      ...creativeAgents.slice(slotsPerCategory),
      ...integratedAgents.slice(slotsPerCategory),
    ];

    balanced.push(...allRemaining.slice(0, maxCount - balanced.length));
  }

  logger.debug("تم موازنة الوكلاء", { count: balanced.length });
  return balanced.slice(0, maxCount);
}

/**
 * تجنب التكرار - اختيار أنواع وكلاء فريدة
 * 
 * @description
 * يزيل الوكلاء المكررين من نفس النوع للحصول على تنوع أفضل
 * 
 * @param agents - مصفوفة الوكلاء
 * @returns مصفوفة الوكلاء الفريدين
 */
export function avoidRedundancy(agents: BaseAgent[]): BaseAgent[] {
  logger.debug("إزالة الوكلاء المكررين");

  const seenTaskTypes = new Set<TaskType>();
  const uniqueAgents: BaseAgent[] = [];

  for (const agent of agents) {
    const config = agent.getConfig();
    const taskType = config.taskType;

    // السماح بتعدد الوكلاء التحليليين والإبداعيين، لكن تجنب التكرار التام
    if (!seenTaskTypes.has(taskType)) {
      uniqueAgents.push(agent);
      seenTaskTypes.add(taskType);
    } else {
      // السماح بتكرار واحد للفئات الرئيسية
      if (
        isAnalyticTask(taskType) &&
        uniqueAgents.filter(a => isAnalyticTask(a.getConfig().taskType))
          .length < 2
      ) {
        uniqueAgents.push(agent);
      } else if (
        isCreativeTask(taskType) &&
        uniqueAgents.filter(a => isCreativeTask(a.getConfig().taskType))
          .length < 2
      ) {
        uniqueAgents.push(agent);
      }
    }
  }

  logger.debug("تم تقليص الوكلاء المكررين", {
    original: agents.length,
    unique: uniqueAgents.length,
  });

  return uniqueAgents;
}

/**
 * Select agents by task types
 * اختيار الوكلاء حسب أنواع المهام
 */
export function selectAgentsByTaskTypes(
  agents: BaseAgent[],
  taskTypes: TaskType[]
): BaseAgent[] {
  return agents.filter(agent => {
    const config = agent.getConfig();
    return taskTypes.includes(config.taskType);
  });
}

/**
 * Select most confident agents
 * اختيار الوكلاء الأكثر ثقة
 */
export function selectMostConfidentAgents(
  agents: BaseAgent[],
  count: number
): BaseAgent[] {
  // Note: We can't measure confidence without executing tasks
  // For now, return first N agents
  // In a real implementation, we might use historical confidence scores

  return agents.slice(0, count);
}

/**
 * Create debate participants with custom roles
 * إنشاء مشاركين بأدوار مخصصة
 */
export function createParticipantsWithRoles(
  agentRolePairs: { agent: BaseAgent; role: DebateRole }[]
): DebateParticipant[] {
  return agentRolePairs.map(pair => ({
    agent: pair.agent,
    role: pair.role,
    voteWeight: pair.role === DebateRole.SYNTHESIZER ? 1.2 : 1.0,
  }));
}

// ===== Helper Functions =====

/**
 * Check if task type is analytic
 */
function isAnalyticTask(taskType: TaskType): boolean {
  const analyticTasks = [
    TaskType.ANALYSIS,
    TaskType.CHARACTER_ANALYSIS,
    TaskType.CHARACTER_DEEP_ANALYZER,
    TaskType.PLOT_ANALYSIS,
    TaskType.THEME_ANALYSIS,
    TaskType.DIALOGUE_ANALYSIS,
    TaskType.DIALOGUE_ADVANCED_ANALYZER,
    TaskType.DIALOGUE_FORENSICS,
    TaskType.STRUCTURE_ANALYSIS,
    TaskType.VISUAL_CINEMATIC_ANALYZER,
    TaskType.THEMES_MESSAGES_ANALYZER,
    TaskType.THEMATIC_MINING,
    TaskType.CULTURAL_HISTORICAL_ANALYZER,
    TaskType.PRODUCIBILITY_ANALYZER,
    TaskType.TARGET_AUDIENCE_ANALYZER,
    TaskType.LITERARY_QUALITY_ANALYZER,
  ];

  return analyticTasks.includes(taskType);
}

/**
 * Check if task type is creative
 */
function isCreativeTask(taskType: TaskType): boolean {
  const creativeTasks = [
    TaskType.CREATIVE,
    TaskType.CHARACTER_DEVELOPMENT,
    TaskType.CHARACTER_VOICE,
    TaskType.CHARACTER_NETWORK,
    TaskType.PLOT_DEVELOPMENT,
    TaskType.PLOT_PREDICTOR,
    TaskType.DIALOGUE_ENHANCEMENT,
    TaskType.SCENE_EXPANSION,
    TaskType.SCENE_GENERATOR,
    TaskType.CONFLICT_ENHANCEMENT,
    TaskType.CONFLICT_DYNAMICS,
    TaskType.COMPLETION,
    TaskType.ADAPTIVE_REWRITING,
    TaskType.WORLD_BUILDER,
    TaskType.TENSION_OPTIMIZER,
    TaskType.RHYTHM_MAPPING,
    TaskType.STYLE_FINGERPRINT,
  ];

  return creativeTasks.includes(taskType);
}

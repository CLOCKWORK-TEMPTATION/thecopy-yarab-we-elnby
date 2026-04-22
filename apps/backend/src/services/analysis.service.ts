import { PipelineInput, PipelineRunResult, Station1Output, StationOutput } from '@/types';
import { logger } from '@/utils/logger';
import { multiAgentOrchestrator, TaskType } from './agents';

export class AnalysisService {

  constructor() {
  }

  /**
   * NEW: Multi-Agent Pipeline using advanced orchestration
   * This replaces the simplified seven stations with real AI agents
   */
  async runFullPipeline(input: PipelineInput): Promise<PipelineRunResult> {
    const startTime = Date.now();
    logger.info('Starting multi-agent analysis pipeline', { projectName: input.projectName });

    try {
      // Define the agents to run for comprehensive analysis
      const agentTasks: TaskType[] = [
        TaskType.CHARACTER_DEEP_ANALYZER,
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        TaskType.VISUAL_CINEMATIC_ANALYZER,
        TaskType.THEMES_MESSAGES_ANALYZER,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.PRODUCIBILITY_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
      ];

      // Execute multi-agent orchestration
      const orchestrationResult = await multiAgentOrchestrator.executeAgents({
        fullText: input.fullText,
        projectName: input.projectName,
        taskTypes: agentTasks,
        context: {
          projectName: input.projectName,
          language: input.language,
          ...input["context"],
        },
        options: {
          parallel: true, // Run agents in parallel for efficiency
          includeMetadata: true,
        },
      });

      // Convert agent results to station outputs for compatibility
      const stationOutputs = this.convertAgentResultsToStations(
        orchestrationResult,
        input
      );

      const endTime = Date.now();
      
      return {
        stationOutputs: stationOutputs,
        pipelineMetadata: {
          stationsCompleted: 7,
          totalExecutionTime: orchestrationResult.summary.totalExecutionTime,
          startedAt: orchestrationResult.metadata?.startedAt || new Date(startTime).toISOString(),
          finishedAt: orchestrationResult.metadata?.finishedAt || new Date(endTime).toISOString(),
          agentsUsed: agentTasks.length,
          averageConfidence: orchestrationResult.summary.averageConfidence,
          successfulAgents: orchestrationResult.summary.successfulTasks,
        },
      };
    } catch (error) {
      logger.error('Multi-agent pipeline execution failed:', error);
      throw error;
    }
  }

  /**
   * Convert agent orchestration results to station output format
   * This maintains backward compatibility with the frontend
   */
  private convertAgentResultsToStations(
    orchestrationResult: any,
    _input: PipelineInput
  ): any {
    const results = orchestrationResult.results;

    const characterAnalysis = results.get(TaskType.CHARACTER_DEEP_ANALYZER);
    const dialogueAnalysis = results.get(TaskType.DIALOGUE_ADVANCED_ANALYZER);
    const visualAnalysis = results.get(TaskType.VISUAL_CINEMATIC_ANALYZER);
    const themesAnalysis = results.get(TaskType.THEMES_MESSAGES_ANALYZER);
    const culturalAnalysis = results.get(TaskType.CULTURAL_HISTORICAL_ANALYZER);
    const producibilityAnalysis = results.get(TaskType.PRODUCIBILITY_ANALYZER);
    const audienceAnalysis = results.get(TaskType.TARGET_AUDIENCE_ANALYZER);
    const station1 = this.runStation1(characterAnalysis);
    const station2 = this.runStation2(dialogueAnalysis);
    const station3 = this.runStation3(visualAnalysis);
    const station4 = this.runStation4(themesAnalysis);
    const station5 = this.runStation5(culturalAnalysis);
    const station6 = this.runStation6(producibilityAnalysis);
    const station7 = this.runStation7(audienceAnalysis, results);

    return {
      station1,
      station2,
      station3,
      station4,
      station5,
      station6,
      station7,
    };
  }

  private buildStationDetails(agentResult: any, extraDetails?: Record<string, unknown>) {
    return {
      fullAnalysis: agentResult?.text || '',
      confidence: agentResult?.confidence || 0,
      notes: Array.isArray(agentResult?.notes) ? agentResult.notes : [],
      ...(extraDetails || {}),
    };
  }

  private runStation1(characterAnalysis: any): Station1Output {
    return {
      stationId: 1,
      stationName: 'التحليل العميق للشخصيات',
      executionTime: characterAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      majorCharacters: this.extractCharacters(characterAnalysis?.text || ''),
      relationships: this.extractRelationships(characterAnalysis?.text || ''),
      narrativeStyleAnalysis: {
        overallTone: 'درامي',
        pacing: 'متوسط',
        complexity: 8,
      },
      details: this.buildStationDetails(characterAnalysis),
    };
  }

  private runStation2(dialogueAnalysis: any): StationOutput {
    return {
      stationId: 2,
      stationName: 'التحليل المتقدم للحوار',
      executionTime: dialogueAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(dialogueAnalysis),
    };
  }

  private runStation3(visualAnalysis: any): StationOutput {
    return {
      stationId: 3,
      stationName: 'التحليل البصري والسينمائي',
      executionTime: visualAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(visualAnalysis),
    };
  }

  private runStation4(themesAnalysis: any): StationOutput {
    return {
      stationId: 4,
      stationName: 'تحليل الموضوعات والرسائل',
      executionTime: themesAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(themesAnalysis),
    };
  }

  private runStation5(culturalAnalysis: any): StationOutput {
    return {
      stationId: 5,
      stationName: 'التحليل الثقافي والتاريخي',
      executionTime: culturalAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(culturalAnalysis),
    };
  }

  private runStation6(producibilityAnalysis: any): StationOutput {
    return {
      stationId: 6,
      stationName: 'تحليل قابلية الإنتاج',
      executionTime: producibilityAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(producibilityAnalysis),
    };
  }

  private runStation7(audienceAnalysis: any, results: Map<TaskType, any>): StationOutput {
    return {
      stationId: 7,
      stationName: 'تحليل الجمهور المستهدف والتقرير النهائي',
      executionTime: audienceAnalysis?.metadata?.processingTime || 0,
      status: 'completed',
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(audienceAnalysis, {
        finalReport: this.generateFinalReport(results),
      }),
    };
  }

  /**
   * Extract character names from analysis text (simplified)
   */
  private extractCharacters(analysisText: string): string[] {
    // Simple extraction - look for patterns indicating character names
    const characters: string[] = [];
    const lines = analysisText.split('\n');
    
    for (const line of lines) {
      if (line.includes('شخصية') || line.includes('الشخصيات') || line.includes('البطل')) {
        const matches = line.match(/[\u0600-\u06FF\s]+/g);
        if (matches) {
          characters.push(...matches.filter(m => m.trim().length > 2));
        }
      }
    }
    
    return [...new Set(characters)].slice(0, 10);
  }

  private extractRelationships(text: string): Array<{
    character1: string;
    character2: string;
    relationshipType: string;
    strength: number;
  }> {
    if (!text.trim()) {
      return [];
    }

    const names = (text.match(/[\u0600-\u06FF]{3,}/g) || [])
      .map((value) => value.trim())
      .filter((value) => value.length >= 3);

    const relationshipType = text.includes('حب')
      ? 'حب'
      : text.includes('صراع')
        ? 'صراع'
        : text.includes('صداقة')
          ? 'صداقة'
          : 'غير محددة';

    return [
      {
        character1: names[0] || 'الشخصية الأولى',
        character2: names[1] || 'الشخصية الثانية',
        relationshipType,
        strength: 0.5,
      },
    ];
  }

  /**
   * Generate comprehensive final report from all agent results
   */
  private generateFinalReport(results: Map<TaskType, any>): string {
    let report = '# التقرير التحليلي الشامل\n\n';

    // Add summaries from each agent
    const agentNames = [
      { type: TaskType.CHARACTER_DEEP_ANALYZER, title: '## تحليل الشخصيات' },
      { type: TaskType.DIALOGUE_ADVANCED_ANALYZER, title: '## تحليل الحوار' },
      { type: TaskType.VISUAL_CINEMATIC_ANALYZER, title: '## التحليل البصري' },
      { type: TaskType.THEMES_MESSAGES_ANALYZER, title: '## الموضوعات والرسائل' },
      { type: TaskType.CULTURAL_HISTORICAL_ANALYZER, title: '## السياق الثقافي' },
      { type: TaskType.PRODUCIBILITY_ANALYZER, title: '## قابلية الإنتاج' },
      { type: TaskType.TARGET_AUDIENCE_ANALYZER, title: '## الجمهور المستهدف' },
    ];

    for (const agent of agentNames) {
      const result = results.get(agent.type);
      if (result && result.text) {
        report += `${agent["title"]}\n${result.text.substring(0, 500)}...\n\n`;
      }
    }

    report += '## الخلاصة\n';
    report += 'تم إجراء تحليل شامل باستخدام نظام الوكلاء المتعددين المتقدم.\n';

    return report;
  }
}

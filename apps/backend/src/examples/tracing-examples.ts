/**
 * Advanced OpenTelemetry Usage Examples
 * 
 * This file demonstrates how to create custom spans, add attributes,
 * and record events for specific operations in your application.
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';

/**
 * Example 1: Basic custom span for a business operation
 */
export async function processUserRequest(userId: string): Promise<void> {
  const tracer = trace.getTracer('user-service');
  
  const span = tracer.startSpan('process_user_request', {
    attributes: {
      'user.id': userId,
      'operation.type': 'user_processing',
    },
  });

  try {
    // Simulate some processing
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    // Add custom events
    span.addEvent('user_data_fetched', {
      'records.count': 10,
    });

    // Mark span as successful
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    // Record the error
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    // Always end the span
    span.end();
  }
}

/**
 * Example 2: Nested spans to track sub-operations
 */
export async function analyzeScript(scriptId: string): Promise<void> {
  const tracer = trace.getTracer('analysis-service');
  
  // Parent span
  const parentSpan = tracer.startSpan('analyze_script', {
    attributes: {
      'script.id': scriptId,
    },
  });

  try {
    // Create a context with the parent span
    await context.with(trace.setSpan(context.active(), parentSpan), async () => {
      // Child span 1: Parse script
      const parseSpan = tracer.startSpan('parse_script');
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        parseSpan.addEvent('script_parsed', {
          'lines.count': 150,
          'scenes.count': 12,
        });
        parseSpan.setStatus({ code: SpanStatusCode.OK });
      } finally {
        parseSpan.end();
      }

      // Child span 2: AI Analysis
      const aiSpan = tracer.startSpan('ai_analysis', {
        attributes: {
          'ai.model': 'gemini-pro',
          'ai.temperature': 0.7,
        },
      });
      try {
        await new Promise((resolve) => setTimeout(resolve, 200));
        aiSpan.addEvent('ai_response_received', {
          'tokens.consumed': 1500,
        });
        aiSpan.setStatus({ code: SpanStatusCode.OK });
      } finally {
        aiSpan.end();
      }

      // Child span 3: Store results
      const storeSpan = tracer.startSpan('store_results');
      try {
        await new Promise((resolve) => setTimeout(resolve, 30));
        storeSpan.setStatus({ code: SpanStatusCode.OK });
      } finally {
        storeSpan.end();
      }
    });

    parentSpan.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    parentSpan.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    parentSpan.recordException(error as Error);
    throw error;
  } finally {
    parentSpan.end();
  }
}

/**
 * Example 3: Database operation tracing
 */
export async function getUserProjects(userId: string): Promise<any[]> {
  const tracer = trace.getTracer('database-service');
  
  const span = tracer.startSpan('db.query.user_projects', {
    attributes: {
      'db.system': 'postgresql',
      'db.operation': 'SELECT',
      'db.table': 'projects',
      'user.id': userId,
    },
  });

  try {
    // Simulate database query
    const startTime = Date.now();
    const projects = await new Promise((resolve) =>
      setTimeout(() => resolve([{ id: 1 }, { id: 2 }]), 80)
    );
    const duration = Date.now() - startTime;

    // Add query metrics
    span.setAttributes({
      'db.query.duration_ms': duration,
      'db.result.count': Array.isArray(projects) ? projects.length : 0,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return projects as any[];
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Database error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Example 4: External API call tracing
 */
export async function callExternalAI(prompt: string): Promise<string> {
  const tracer = trace.getTracer('external-service');
  
  const span = tracer.startSpan('external.api.gemini', {
    attributes: {
      'http.method': 'POST',
      'http.url': 'https://generativelanguage.googleapis.com/v1/models',
      'ai.model': 'gemini-pro',
      'prompt.length': prompt.length,
    },
  });

  try {
    // Simulate API call
    const response = await new Promise((resolve) =>
      setTimeout(() => resolve('AI response'), 150)
    );

    span.addEvent('api_response_received', {
      'response.length': String(response).length,
      'http.status_code': 200,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return response as string;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'API error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Example 5: Background job tracing
 */
export async function processQueueJob(jobId: string, jobData: any): Promise<void> {
  const tracer = trace.getTracer('queue-service');
  
  const span = tracer.startSpan('queue.job.process', {
    attributes: {
      'messaging.system': 'bullmq',
      'messaging.operation': 'process',
      'job.id': jobId,
      'job.type': jobData.type || 'unknown',
    },
  });

  try {
    span.addEvent('job_started', {
      'job.attempt': jobData.attemptsMade || 1,
    });

    // Simulate job processing
    await new Promise((resolve) => setTimeout(resolve, 300));

    span.addEvent('job_completed', {
      'processing.duration_ms': 300,
    });

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Job failed',
    });
    span.recordException(error as Error);
    
    // Add failure context
    span.setAttributes({
      'job.failed': true,
      'job.error.type': error instanceof Error ? error.constructor.name : 'UnknownError',
    });
    
    throw error;
  } finally {
    span.end();
  }
}

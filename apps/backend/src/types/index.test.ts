import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  PipelineInputSchema,
  type PipelineInput,
  type StationOutput,
  type Station1Output,
  type PipelineRunResult,
  type ApiResponse,
} from './index';

describe('Type Definitions', () => {
  describe('PipelineInputSchema', () => {
    describe('Valid Input Validation', () => {
      it('should validate minimal valid input', () => {
        const input = {
          fullText: 'Sample dramatic text',
          projectName: 'Test Project',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.fullText).toBe('Sample dramatic text');
          expect(result.data.projectName).toBe('Test Project');
          expect(result.data.language).toBe('ar'); // default
        }
      });

      it('should validate full input with all fields', () => {
        const input: PipelineInput = {
          fullText: 'Complete dramatic text',
          projectName: 'Full Project',
          proseFilePath: '/path/to/file.txt',
          language: 'en',
          context: {
            title: 'Test Drama',
            author: 'Test Author',
            sceneHints: ['Scene 1', 'Scene 2'],
            genre: 'Tragedy',
          },
          flags: {
            runStations: true,
            fastMode: false,
            skipValidation: false,
            verboseLogging: true,
          },
          agents: {
            temperature: 0.5,
            maxTokens: 2000,
            model: 'gemini-pro',
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should apply default values for optional fields', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.language).toBe('ar');
          expect(result.data["context"]).toEqual({});
          expect(result.data.flags).toEqual({
            runStations: true,
            fastMode: false,
            skipValidation: false,
            verboseLogging: false,
          });
          expect(result.data.agents).toEqual({ temperature: 0.2 });
        }
      });

      it('should validate Arabic language code', () => {
        const input = {
          fullText: 'نص درامي',
          projectName: 'مشروع',
          language: 'ar' as const,
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate English language code', () => {
        const input = {
          fullText: 'Dramatic text',
          projectName: 'Project',
          language: 'en' as const,
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid Input Validation', () => {
      it('should reject empty fullText', () => {
        const input = {
          fullText: '',
          projectName: 'Project',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(false);

        if (!result.success) {
          expect(result.error.issues[0].message).toContain('النص مطلوب');
        }
      });

      it('should reject empty projectName', () => {
        const input = {
          fullText: 'Text',
          projectName: '',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(false);

        if (!result.success) {
          expect(result.error.issues[0].message).toContain('اسم المشروع مطلوب');
        }
      });

      it('should reject missing required fields', () => {
        const input = {
          fullText: 'Text',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid language code', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          language: 'fr', // Invalid - only 'ar' or 'en' allowed
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid temperature (too low)', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          agents: {
            temperature: -0.1,
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid temperature (too high)', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          agents: {
            temperature: 2.1,
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('Nested Object Validation', () => {
      it('should validate context object with all fields', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          context: {
            title: 'Drama Title',
            author: 'Author Name',
            sceneHints: ['Act 1', 'Act 2'],
            genre: 'Comedy',
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data["context"]["title"]).toBe('Drama Title');
          expect(result.data["context"].sceneHints).toHaveLength(2);
        }
      });

      it('should validate flags object with all boolean fields', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          flags: {
            runStations: false,
            fastMode: true,
            skipValidation: true,
            verboseLogging: false,
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.flags.fastMode).toBe(true);
          expect(result.data.flags.runStations).toBe(false);
        }
      });

      it('should validate agents configuration', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          agents: {
            temperature: 0.7,
            maxTokens: 4096,
            model: 'gemini-1.5-pro',
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.agents.temperature).toBe(0.7);
          expect(result.data.agents.maxTokens).toBe(4096);
        }
      });
    });

    describe('Edge Cases', () => {
      it('should handle very long text', () => {
        const longText = 'a'.repeat(100000);
        const input = {
          fullText: longText,
          projectName: 'Project',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle special characters in text', () => {
        const input = {
          fullText: 'Text with special chars: @#$%^&*()',
          projectName: 'Project!@#',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle Unicode characters (Arabic)', () => {
        const input = {
          fullText: 'نص درامي عربي متكامل مع علامات الترقيم،.',
          projectName: 'مشروع درامي',
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle empty sceneHints array', () => {
        const input = {
          fullText: 'Text',
          projectName: 'Project',
          context: {
            sceneHints: [],
          },
        };

        const result = PipelineInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should validate boundary temperature values', () => {
        const input1 = {
          fullText: 'Text',
          projectName: 'Project',
          agents: { temperature: 0 },
        };

        const input2 = {
          fullText: 'Text',
          projectName: 'Project',
          agents: { temperature: 2 },
        };

        expect(PipelineInputSchema.safeParse(input1).success).toBe(true);
        expect(PipelineInputSchema.safeParse(input2).success).toBe(true);
      });
    });
  });

  describe('Type Interfaces', () => {
    describe('StationOutput', () => {
      it('should accept valid station output', () => {
        const output: StationOutput = {
          stationId: 1,
          stationName: 'Character Analysis',
          executionTime: 1500,
          status: 'completed',
          timestamp: new Date().toISOString(),
        };

        expect(output.stationId).toBe(1);
        expect(output["status"]).toBe('completed');
      });

      it('should accept failed status', () => {
        const output: StationOutput = {
          stationId: 2,
          stationName: 'Plot Analysis',
          executionTime: 500,
          status: 'failed',
          timestamp: new Date().toISOString(),
        };

        expect(output["status"]).toBe('failed');
      });
    });

    describe('Station1Output', () => {
      it('should extend StationOutput with specific fields', () => {
        const output: Station1Output = {
          stationId: 1,
          stationName: 'Initial Analysis',
          executionTime: 2000,
          status: 'completed',
          timestamp: new Date().toISOString(),
          majorCharacters: ['John', 'Jane', 'Bob'],
          relationships: [
            {
              character1: 'John',
              character2: 'Jane',
              relationshipType: 'romance',
              strength: 0.8,
            },
          ],
          narrativeStyleAnalysis: {
            overallTone: 'dramatic',
            pacing: 'fast',
            complexity: 7,
          },
        };

        expect(output.majorCharacters).toHaveLength(3);
        expect(output.relationships[0].strength).toBe(0.8);
        expect(output.narrativeStyleAnalysis.complexity).toBe(7);
      });
    });

    describe('PipelineRunResult', () => {
      it('should structure complete pipeline results', () => {
        const result: PipelineRunResult = {
          stationOutputs: {
            station1: {
              stationId: 1,
              stationName: 'Station 1',
              executionTime: 1000,
              status: 'completed',
              timestamp: new Date().toISOString(),
              majorCharacters: [],
              relationships: [],
              narrativeStyleAnalysis: {
                overallTone: 'neutral',
                pacing: 'moderate',
                complexity: 5,
              },
            },
            station2: {},
            station3: {},
            station4: {},
            station5: {},
            station6: {},
            station7: {},
          },
          pipelineMetadata: {
            stationsCompleted: 7,
            totalExecutionTime: 10000,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          },
        };

        expect(result.pipelineMetadata.stationsCompleted).toBe(7);
        expect(result.stationOutputs.station1["status"]).toBe('completed');
      });
    });

    describe('ApiResponse', () => {
      it('should represent successful API response', () => {
        const response: ApiResponse<{ id: string }> = {
          success: true,
          data: { id: '123' },
          message: 'Operation successful',
        };

        expect(response.success).toBe(true);
        expect(response.data?.id).toBe('123');
      });

      it('should represent error API response', () => {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          message: 'Please check your input',
        };

        expect(response.success).toBe(false);
        expect(response.error).toBe('Validation failed');
      });

      it('should support generic type parameter', () => {
        const response: ApiResponse<PipelineInput> = {
          success: true,
          data: {
            fullText: 'Text',
            projectName: 'Project',
            language: 'ar',
            context: {},
            flags: {
              runStations: true,
              fastMode: false,
              skipValidation: false,
              verboseLogging: false,
            },
            agents: { temperature: 0.2 },
          },
        };

        expect(response.data?.projectName).toBe('Project');
      });
    });
  });

  describe('Schema Transformations', () => {
    it('should infer correct TypeScript type from schema', () => {
      type InferredType = z.infer<typeof PipelineInputSchema>;

      const input: InferredType = {
        fullText: 'Text',
        projectName: 'Project',
        language: 'ar',
        context: {},
        flags: {
          runStations: true,
          fastMode: false,
          skipValidation: false,
          verboseLogging: false,
        },
        agents: { temperature: 0.2 },
      };

      // Type should match PipelineInput
      const typedInput: PipelineInput = input;
      expect(typedInput.fullText).toBe('Text');
    });
  });
});

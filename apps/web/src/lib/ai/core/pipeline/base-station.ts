import { GeminiService } from "../../stations/gemini-service";
import { logger } from "../../utils/logger";

export interface StationConfig<TInput, TOutput> {
  stationId: string;
  name: string;
  description: string;
  cacheEnabled?: boolean;
  performanceTracking?: boolean;
  inputValidation?: (input: TInput) => boolean;
  outputValidation?: (output: TOutput) => boolean;
}

export abstract class BaseStation<TInput, TOutput> {
  protected config: StationConfig<TInput, TOutput>;
  protected geminiService: GeminiService;

  constructor(
    config: StationConfig<TInput, TOutput>,
    geminiService: GeminiService
  ) {
    this.config = config;
    this.geminiService = geminiService;
  }

  async execute(
    input: TInput
  ): Promise<{ output: TOutput; executionTime: number }> {
    const startTime = Date.now();

    try {
      if (this.config.inputValidation && !this.config.inputValidation(input)) {
        throw new Error("Invalid input data");
      }

      const output = await this.process(input);

      if (
        this.config.outputValidation &&
        !this.config.outputValidation(output)
      ) {
        throw new Error("Invalid output data");
      }

      const executionTime = Date.now() - startTime;
      if (this.config.performanceTracking) {
        logger.info(
          `Station ${this.config.name} executed in ${executionTime}ms`
        );
      }

      return { output, executionTime };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error in station ${this.config.name}: ${errorMessage}`, {
        input: this.extractRequiredData(input),
      });
      return {
        output: this.getErrorFallback(),
        executionTime: Date.now() - startTime,
      };
    }
  }

  protected abstract process(input: TInput): Promise<TOutput>;
  protected abstract extractRequiredData(
    input: TInput
  ): Record<string, unknown>;
  protected abstract getErrorFallback(): TOutput;
}

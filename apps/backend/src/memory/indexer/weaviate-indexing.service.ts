/* eslint-disable complexity -- experimental memory indexing module */
import { createHash } from "crypto";

import { SemanticChunker, type SemanticChunk } from "@the-copy/core-memory";

import { embeddingsService } from "@/services/rag/embeddings.service";
import { definedProps } from "@/utils/defined-props";

import { embeddingGenerator } from "../embeddings/generator";
import { weaviateStore } from "../vector-store/client";
import {
  AdHocChunksSchema,
  ArchitectureSchema,
  CodeChunksSchema,
  DecisionsSchema,
  DocumentationSchema,
} from "../vector-store/schema";

import { repositoryCrawler } from "./repository-crawler";

import type {
  AdHocChunkData,
  CodeChunkData,
  DecisionData,
  DocumentationData,
  FileInfo,
  IndexingStats,
} from "../types";

type ManualMemoryType = "decision" | "documentation";

const CODE_EXTENSIONS = new Set(["ts", "tsx", "js", "jsx", "json"]);

export class WeaviateIndexingService {
  private chunker: SemanticChunker;

  constructor() {
    this.chunker = new SemanticChunker();
  }

  async ensureCollections(): Promise<void> {
    await Promise.all([
      weaviateStore.ensureCollection("CodeChunks", CodeChunksSchema),
      weaviateStore.ensureCollection("Documentation", DocumentationSchema),
      weaviateStore.ensureCollection("Decisions", DecisionsSchema),
      weaviateStore.ensureCollection("Architecture", ArchitectureSchema),
      weaviateStore.ensureCollection("AdHocChunks", AdHocChunksSchema),
    ]);
  }

  async indexRepository(options: {
    repoPath: string;
    specificFiles?: string[];
    maxFiles?: number;
  }): Promise<IndexingStats> {
    const files =
      options.specificFiles && options.specificFiles.length > 0
        ? await repositoryCrawler.crawlSpecific(
            options.repoPath,
            options.specificFiles
          )
        : await repositoryCrawler.crawl({
            rootPath: options.repoPath,
            maxFiles: options.maxFiles ?? 5000,
          });

    return this.indexFiles(files);
  }

  async indexFiles(files: FileInfo[]): Promise<IndexingStats> {
    await this.ensureCollections();

    const stats: IndexingStats = {
      filesProcessed: 0,
      chunksIndexed: 0,
      collections: {},
    };

    for (const file of files) {
      const fileStats = await this.indexFile(file);
      stats.filesProcessed += fileStats.filesProcessed;
      stats.chunksIndexed += fileStats.chunksIndexed;

      for (const [collection, count] of Object.entries(fileStats.collections)) {
        stats.collections[collection] = (stats.collections[collection] || 0) + count;
      }
    }

    return stats;
  }

  async indexAdHocDocument(
    document: string,
    source = "request-document",
    options: {
      maxChunkSize?: number;
      coherenceThreshold?: number;
    } = {}
  ): Promise<{ documentHash: string; totalChunks: number; inserted: number }> {
    await this.ensureCollections();

    const normalizedDocument = document.trim();
    const documentHash = this.hashText(normalizedDocument);
    const chunker = new SemanticChunker({
      ...definedProps({
        maxChunkSize: options.maxChunkSize,
        coherenceThreshold: options.coherenceThreshold,
      }),
    });
    const semanticChunks = await chunker.chunkText(
      normalizedDocument,
      (text) => embeddingsService.getEmbedding(text)
    );

    const collection = weaviateStore.getCollection("AdHocChunks");
    await collection.data.deleteMany(
      collection.filter.byProperty("documentHash").equal(documentHash),
      { verbose: false }
    );

    if (semanticChunks.length === 0) {
      return {
        documentHash,
        totalChunks: 0,
        inserted: 0,
      };
    }

    const chunkEmbeddings = await embeddingsService.getEmbeddingsBatch(
      semanticChunks.map((chunk) => chunk.text)
    );

    const objects = semanticChunks.map((chunk, index) => ({
      id: this.buildChunkId("AdHocChunks", documentHash, index),
      properties: this.toAdHocChunkData(
        chunk,
        source,
        documentHash,
        index,
        semanticChunks.length
      ),
      vectors: {
        embedding: chunkEmbeddings[index],
      },
    }));

    await weaviateStore.insertMany("AdHocChunks", objects);

    return {
      documentHash,
      totalChunks: semanticChunks.length,
      inserted: objects.length,
    };
  }

  async storeMemoryEntry(args: {
    type: ManualMemoryType;
    content: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<{ id: string; collection: string }> {
    await this.ensureCollections();

    const metadata = args.metadata ?? {};
    const embedding = await embeddingGenerator.generateForDocumentation(
      args.content,
      definedProps({
        title: typeof metadata["title"] === "string" ? metadata["title"] : undefined,
      }),
      { dimensionality: 1536 }
    );

    const contentHash = embedding.contentHash;

    if (args.type === "decision") {
      const collectionName = "Decisions";
      const collection = weaviateStore.getCollection(collectionName);
      const id = this.buildChunkId(collectionName, contentHash, 0);

      await collection.data.deleteMany(
        collection.filter.byProperty("contentHash").equal(contentHash),
        { verbose: false }
      );
      await collection.data.insert({
        id,
        properties: {
          content: args.content,
          title:
            typeof metadata["title"] === "string"
              ? metadata["title"]
              : "Untitled Decision",
          decisionId:
            typeof metadata["decisionId"] === "string"
              ? metadata["decisionId"]
              : `ADR-${Date.now()}`,
          status:
            metadata["status"] === "accepted" ||
            metadata["status"] === "deprecated" ||
            metadata["status"] === "superseded"
              ? metadata["status"]
              : "proposed",
          date: new Date().toISOString(),
          context: typeof metadata["context"] === "string" ? metadata["context"] : "",
          decision:
            typeof metadata["decision"] === "string"
              ? metadata["decision"]
              : args.content,
          consequences:
            typeof metadata["consequences"] === "string"
              ? metadata["consequences"]
              : "",
          alternatives: Array.isArray(metadata["alternatives"])
            ? (metadata["alternatives"] as string[])
            : [],
          relatedDecisions: Array.isArray(metadata["relatedDecisions"])
            ? (metadata["relatedDecisions"] as string[])
            : [],
          affectedFiles: Array.isArray(metadata["affectedFiles"])
            ? (metadata["affectedFiles"] as string[])
            : [],
          tags: args.tags ?? [],
          contentHash,
        } satisfies DecisionData,
        vectors: {
          embedding: embedding.embedding,
        },
      });

      return { id, collection: collectionName };
    }

    const collectionName = "Documentation";
    const collection = weaviateStore.getCollection(collectionName);
    const id = this.buildChunkId(collectionName, contentHash, 0);

    await collection.data.deleteMany(
      collection.filter.byProperty("contentHash").equal(contentHash),
      { verbose: false }
    );
    await collection.data.insert({
      id,
      properties: {
        content: args.content,
        filePath:
          typeof metadata["filePath"] === "string"
            ? metadata["filePath"]
            : "manual-entry",
        title: typeof metadata["title"] === "string" ? metadata["title"] : "Untitled",
        section: typeof metadata["section"] === "string" ? metadata["section"] : "",
        docType: typeof metadata["docType"] === "string" ? metadata["docType"] : "NOTE",
        chunkIndex: 0,
        contentHash,
        lastModified: new Date().toISOString(),
        tags: args.tags ?? [],
        relatedFiles: Array.isArray(metadata["relatedFiles"])
          ? (metadata["relatedFiles"] as string[])
          : [],
      } satisfies DocumentationData,
      vectors: {
        embedding: embedding.embedding,
      },
    });

    return { id, collection: collectionName };
  }

  private async indexFile(file: FileInfo): Promise<IndexingStats> {
    const stats: IndexingStats = {
      filesProcessed: 1,
      chunksIndexed: 0,
      collections: {},
    };

    if (CODE_EXTENSIONS.has(file.extension)) {
      const count = await this.indexCodeFile(file);
      stats.chunksIndexed += count;
      stats.collections["CodeChunks"] = count;
      return stats;
    }

    if (file.extension === "md") {
      const docCount = await this.indexDocumentationFile(file);
      stats.chunksIndexed +=
        docCount.documentation + docCount.decision + docCount.architecture;
      if (docCount.documentation > 0) {
        stats.collections["Documentation"] = docCount.documentation;
      }
      if (docCount.decision > 0) {
        stats.collections["Decisions"] = docCount.decision;
      }
      if (docCount.architecture > 0) {
        stats.collections["Architecture"] = docCount.architecture;
      }
      return stats;
    }

    return stats;
  }

  private async indexCodeFile(file: FileInfo): Promise<number> {
    const semanticChunks = await this.chunker.chunkText(
      file.content,
      (text) => embeddingsService.getEmbedding(text)
    );

    if (semanticChunks.length === 0) {
      return 0;
    }

    const collection = weaviateStore.getCollection("CodeChunks");
    await collection.data.deleteMany(
      collection.filter.byProperty("filePath").equal(file.relativePath),
      { verbose: false }
    );

    const chunkEmbeddings = await embeddingsService.getEmbeddingsBatch(
      semanticChunks.map((chunk) => chunk.text)
    );
    const imports = repositoryCrawler.extractImports(file.content, file.language);
    const exports = repositoryCrawler.extractExports(file.content, file.language);
    const functions = repositoryCrawler.extractFunctions(file.content, file.language);
    const classes = repositoryCrawler.extractClasses(file.content, file.language);

    const objects = semanticChunks.map((chunk, index) => {
      const lineRange = this.getLineRange(file.content, chunk);
      const contentHash = this.hashText(chunk.text);

      return {
        id: this.buildChunkId("CodeChunks", contentHash, index),
        properties: {
          content: chunk.text,
          filePath: file.relativePath,
          language: file.language,
          chunkIndex: index,
          totalChunks: semanticChunks.length,
          startLine: lineRange.startLine,
          endLine: lineRange.endLine,
          contentHash,
          lastModified: file.lastModified.toISOString(),
          gitCommit: "unknown",
          imports,
          exports,
          functions,
          classes,
          tags: ["code"],
        } satisfies CodeChunkData,
        vectors: {
          embedding: chunkEmbeddings[index],
        },
      };
    });

    await weaviateStore.insertMany("CodeChunks", objects);
    return objects.length;
  }

  private async indexDocumentationFile(file: FileInfo): Promise<{
    documentation: number;
    decision: number;
    architecture: number;
  }> {
    const semanticChunks = await this.chunker.chunkText(
      file.content,
      (text) => embeddingsService.getEmbedding(text)
    );

    let documentation = 0;
    let decision = 0;
    let architecture = 0;

    if (this.isDecisionFile(file)) {
      const collection = weaviateStore.getCollection("Decisions");
      const contentHash = this.hashText(file.content);

      await collection.data.deleteMany(
        collection.filter.byProperty("contentHash").equal(contentHash),
        { verbose: false }
      );

      const embedding = await embeddingGenerator.generateForDocumentation(
        file.content,
        { title: this.extractTitle(file.content) },
        { dimensionality: 1536 }
      );

      await collection.data.insert({
        id: this.buildChunkId("Decisions", contentHash, 0),
        properties: {
          content: file.content,
          title: this.extractTitle(file.content),
          decisionId: this.buildDecisionId(file),
          status: "accepted",
          date: file.lastModified.toISOString(),
          context: "",
          decision: file.content,
          consequences: "",
          alternatives: [],
          relatedDecisions: [],
          affectedFiles: [],
          tags: ["decision"],
          contentHash,
        } satisfies DecisionData,
        vectors: {
          embedding: embedding.embedding,
        },
      });

      decision = 1;
    } else if (semanticChunks.length > 0) {
      const collection = weaviateStore.getCollection("Documentation");

      await collection.data.deleteMany(
        collection.filter.byProperty("filePath").equal(file.relativePath),
        { verbose: false }
      );

      const chunkEmbeddings = await embeddingsService.getEmbeddingsBatch(
        semanticChunks.map((chunk) => chunk.text)
      );

      const objects = semanticChunks.map((chunk, index) => {
        const contentHash = this.hashText(chunk.text);
        return {
          id: this.buildChunkId("Documentation", contentHash, index),
          properties: {
            content: chunk.text,
            filePath: file.relativePath,
            title: this.extractTitle(file.content),
            section: "",
            docType: "README",
            chunkIndex: index,
            contentHash,
            lastModified: file.lastModified.toISOString(),
            tags: ["documentation"],
            relatedFiles: [],
          } satisfies DocumentationData,
          vectors: {
            embedding: chunkEmbeddings[index],
          },
        };
      });

      await weaviateStore.insertMany("Documentation", objects);
      documentation = objects.length;
    }

    if (this.isArchitectureDocument(file)) {
      const collection = weaviateStore.getCollection("Architecture");
      const contentHash = this.hashText(file.content);

      await collection.data.deleteMany(
        collection.filter.byProperty("contentHash").equal(contentHash),
        { verbose: false }
      );

      const embedding = await embeddingGenerator.generateForDocumentation(
        file.content,
        { title: this.extractTitle(file.content) },
        { dimensionality: 1536 }
      );

      await collection.data.insert({
        id: this.buildChunkId("Architecture", contentHash, 0),
        properties: {
          description: file.content,
          filePath: file.relativePath,
          diagramType: "markdown",
          imageUri: "",
          components: [],
          relationships: [],
          tags: ["architecture"],
          contentHash,
        },
        vectors: {
          embedding: embedding.embedding,
        },
      });

      architecture = 1;
    }

    return { documentation, decision, architecture };
  }

  private toAdHocChunkData(
    chunk: SemanticChunk,
    source: string,
    documentHash: string,
    chunkIndex: number,
    totalChunks: number
  ): AdHocChunkData {
    return {
      content: chunk.text,
      source,
      documentHash,
      chunkIndex,
      totalChunks,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      coherenceScore: chunk.coherenceScore,
      sentences: chunk.sentences,
      contentHash: this.hashText(chunk.text),
      lastModified: new Date().toISOString(),
      tags: ["ad-hoc"],
    };
  }

  private hashText(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private buildChunkId(
    collection: string,
    contentHash: string,
    chunkIndex: number
  ): string {
    return createHash("sha256")
      .update(`${collection}:${contentHash}:${chunkIndex}`)
      .digest("hex");
  }

  private buildDecisionId(file: FileInfo): string {
    return file.relativePath
      .replace(/\\/g, "-")
      .replace(/[^\w-]/g, "-")
      .replace(/-+/g, "-")
      .toUpperCase();
  }

  private extractTitle(content: string): string {
    const heading = /^#\s+(.+)$/m.exec(content);
    return heading?.[1]?.trim() || "Untitled";
  }

  private isDecisionFile(file: FileInfo): boolean {
    return /adr|decision/i.test(file.relativePath);
  }

  private isArchitectureDocument(file: FileInfo): boolean {
    return (
      /architecture/i.test(file.relativePath) ||
      /```mermaid|flowchart|sequenceDiagram|graph\s+[A-Z]{2}/i.test(file.content)
    );
  }

  private getLineRange(content: string, chunk: SemanticChunk) {
    const startLine = content.slice(0, chunk.startIndex).split(/\r?\n/).length;
    const endLine = content.slice(0, chunk.endIndex).split(/\r?\n/).length;
    return { startLine, endLine };
  }
}

export const weaviateIndexingService = new WeaviateIndexingService();

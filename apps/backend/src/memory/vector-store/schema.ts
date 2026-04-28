/**
 * Weaviate Schema Definitions
 * تعريفات مخططات Weaviate
 */

export const CodeChunksSchema = {
  name: "CodeChunks",
  description: "Code chunks from the repository with embeddings",
  properties: [
    {
      name: "content",
      dataType: "text",
      description: "The actual code content",
      tokenization: "word",
    },
    {
      name: "filePath",
      dataType: "text",
      description: "Relative path to the file",
      tokenization: "field",
    },
    {
      name: "language",
      dataType: "text",
      description: "Programming language",
      tokenization: "field",
    },
    {
      name: "chunkIndex",
      dataType: "int",
      description: "Index of this chunk in the file",
    },
    {
      name: "totalChunks",
      dataType: "int",
      description: "Total number of chunks in the file",
    },
    {
      name: "startLine",
      dataType: "int",
      description: "Starting line number",
    },
    {
      name: "endLine",
      dataType: "int",
      description: "Ending line number",
    },
    {
      name: "contentHash",
      dataType: "text",
      description: "SHA256 hash of content for deduplication",
      tokenization: "field",
    },
    {
      name: "lastModified",
      dataType: "date",
      description: "Last modification timestamp",
    },
    {
      name: "gitCommit",
      dataType: "text",
      description: "Git commit hash when indexed",
      tokenization: "field",
    },
    {
      name: "imports",
      dataType: "text[]",
      description: "List of imports in this chunk",
    },
    {
      name: "exports",
      dataType: "text[]",
      description: "List of exports in this chunk",
    },
    {
      name: "functions",
      dataType: "text[]",
      description: "Function names in this chunk",
    },
    {
      name: "classes",
      dataType: "text[]",
      description: "Class names in this chunk",
    },
    {
      name: "tags",
      dataType: "text[]",
      description: "Manual tags for categorization",
    },
  ],
  vectorizers: [
    {
      name: "embedding",
      vectorIndexConfig: {
        distance: "Cosine",
      },
    },
  ],
};

export const DocumentationSchema = {
  name: "Documentation",
  description: "Documentation files, READMEs, and markdown content",
  properties: [
    {
      name: "content",
      dataType: "text",
      description: "Document content",
      tokenization: "word",
    },
    {
      name: "filePath",
      dataType: "text",
      tokenization: "field",
    },
    {
      name: "title",
      dataType: "text",
      tokenization: "word",
    },
    {
      name: "section",
      dataType: "text",
      description: "Section/heading in the document",
      tokenization: "word",
    },
    {
      name: "docType",
      dataType: "text",
      description: "Type: README, API_DOC, ADR, GUIDE",
      tokenization: "field",
    },
    {
      name: "chunkIndex",
      dataType: "int",
    },
    {
      name: "contentHash",
      dataType: "text",
      tokenization: "field",
    },
    {
      name: "lastModified",
      dataType: "date",
    },
    {
      name: "tags",
      dataType: "text[]",
    },
    {
      name: "relatedFiles",
      dataType: "text[]",
      description: "Files mentioned in this document",
    },
  ],
  vectorizers: [
    {
      name: "embedding",
      vectorIndexConfig: {
        distance: "Cosine",
      },
    },
  ],
};

export const DecisionsSchema = {
  name: "Decisions",
  description: "Architecture Decision Records (ADRs) and important decisions",
  properties: [
    {
      name: "content",
      dataType: "text",
      description: "Full decision content",
      tokenization: "word",
    },
    {
      name: "title",
      dataType: "text",
      description: "Decision title",
      tokenization: "word",
    },
    {
      name: "decisionId",
      dataType: "text",
      description: "Unique decision identifier (e.g., ADR-001)",
      tokenization: "field",
    },
    {
      name: "status",
      dataType: "text",
      description: "proposed, accepted, deprecated, superseded",
      tokenization: "field",
    },
    {
      name: "date",
      dataType: "date",
      description: "Decision date",
    },
    {
      name: "context",
      dataType: "text",
      description: "Decision context",
      tokenization: "word",
    },
    {
      name: "decision",
      dataType: "text",
      description: "The actual decision",
      tokenization: "word",
    },
    {
      name: "consequences",
      dataType: "text",
      description: "Consequences of the decision",
      tokenization: "word",
    },
    {
      name: "alternatives",
      dataType: "text[]",
      description: "Alternatives considered",
    },
    {
      name: "relatedDecisions",
      dataType: "text[]",
      description: "Related ADR references",
    },
    {
      name: "affectedFiles",
      dataType: "text[]",
      description: "Files affected by this decision",
    },
    {
      name: "tags",
      dataType: "text[]",
    },
    {
      name: "contentHash",
      dataType: "text",
      tokenization: "field",
    },
  ],
  vectorizers: [
    {
      name: "embedding",
      vectorIndexConfig: {
        distance: "Cosine",
      },
    },
  ],
};

export const ArchitectureSchema = {
  name: "Architecture",
  description: "Architecture diagrams, flow charts, and visual documentation",
  properties: [
    {
      name: "description",
      dataType: "text",
      description: "Text description of the architecture/diagram",
      tokenization: "word",
    },
    {
      name: "filePath",
      dataType: "text",
      tokenization: "field",
    },
    {
      name: "diagramType",
      dataType: "text",
      description: "mermaid, plantuml, drawio, image",
      tokenization: "field",
    },
    {
      name: "imageUri",
      dataType: "text",
      description: "URI to image if available",
      tokenization: "field",
    },
    {
      name: "components",
      dataType: "text[]",
      description: "Components mentioned in diagram",
    },
    {
      name: "relationships",
      dataType: "text[]",
      description: "Relationships described",
    },
    {
      name: "tags",
      dataType: "text[]",
    },
    {
      name: "contentHash",
      dataType: "text",
      tokenization: "field",
    },
  ],
  vectorizers: [
    {
      name: "embedding",
      vectorIndexConfig: {
        distance: "Cosine",
      },
    },
  ],
};

export const AdHocChunksSchema = {
  name: "AdHocChunks",
  description: "Ephemeral chunks indexed from raw request documents",
  properties: [
    {
      name: "content",
      dataType: "text",
      description: "Chunk content extracted from a raw request document",
      tokenization: "word",
    },
    {
      name: "source",
      dataType: "text",
      description: "Logical source label for the request document",
      tokenization: "field",
    },
    {
      name: "documentHash",
      dataType: "text",
      description: "Deterministic hash for the raw request document",
      tokenization: "field",
    },
    {
      name: "chunkIndex",
      dataType: "int",
      description: "Chunk index within the raw request document",
    },
    {
      name: "totalChunks",
      dataType: "int",
      description: "Total chunks generated for the raw request document",
    },
    {
      name: "startIndex",
      dataType: "int",
      description: "Starting character offset in the original document",
    },
    {
      name: "endIndex",
      dataType: "int",
      description: "Ending character offset in the original document",
    },
    {
      name: "coherenceScore",
      dataType: "number",
      description: "Semantic coherence score for the chunk",
    },
    {
      name: "sentences",
      dataType: "text[]",
      description: "Sentences merged to produce the chunk",
    },
    {
      name: "contentHash",
      dataType: "text",
      description: "SHA256 hash of chunk content",
      tokenization: "field",
    },
    {
      name: "lastModified",
      dataType: "date",
      description: "Indexing timestamp",
    },
    {
      name: "tags",
      dataType: "text[]",
      description: "Classification tags for ad hoc retrieval",
    },
  ],
  vectorizers: [
    {
      name: "embedding",
      vectorIndexConfig: {
        distance: "Cosine",
      },
    },
  ],
};

export const ALL_SCHEMAS = [
  CodeChunksSchema,
  DocumentationSchema,
  DecisionsSchema,
  ArchitectureSchema,
  AdHocChunksSchema,
];

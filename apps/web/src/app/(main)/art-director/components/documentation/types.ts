import type { ApiResponse, ProductionBook, StyleGuide } from "../../types";

export interface BookFormData {
  projectName: string;
  projectNameAr: string;
  director: string;
  productionCompany: string;
}

export interface DecisionFormData {
  title: string;
  description: string;
  category: string;
  rationale: string;
}

export interface ProductionBookState extends ProductionBook {
  id?: string;
}

export interface StyleGuideState extends StyleGuide {
  id?: string;
}

export interface DocumentationStatePayload {
  productionBook: ProductionBookState | null;
  styleGuide: StyleGuideState | null;
  decisionsCount: number;
}

export interface DocumentationExportPayload {
  content: string;
  filename: string;
  mimeType: string;
  format: string;
}

export type DocumentationStateResponse = ApiResponse<DocumentationStatePayload>;
export type ProductionBookResponse = ApiResponse<ProductionBookState>;
export type StyleGuideResponse = ApiResponse<StyleGuideState>;
export type DocumentationExportResponse =
  ApiResponse<DocumentationExportPayload>;

import type { BookFormData, DecisionFormData } from "./types";

export const DEFAULT_BOOK_FORM: BookFormData = {
  projectName: "",
  projectNameAr: "",
  director: "",
  productionCompany: "",
};

export const DEFAULT_DECISION_FORM: DecisionFormData = {
  title: "",
  description: "",
  category: "color",
  rationale: "",
};

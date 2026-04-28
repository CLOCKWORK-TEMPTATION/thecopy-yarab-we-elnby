import { LineItem, Category, Section } from "./types";

export const createLineItem = (
  code: string,
  description: string
): LineItem => ({
  code,
  description,
  amount: 0,
  unit: "Flat",
  rate: 0,
  total: 0,
  notes: "",
  lastModified: new Date().toISOString(),
});

export const createCategory = (
  code: string,
  name: string,
  items: LineItem[]
): Category => ({
  code,
  name,
  items,
  total: 0,
  description: "",
});

export const createSection = (
  id: string,
  name: string,
  categories: Category[],
  color: string
): Section => ({
  id,
  name,
  categories,
  total: 0,
  color,
});

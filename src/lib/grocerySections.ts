import type { CanonicalGroup } from "../types/models";

export interface GrocerySectionInput {
  foodId: string;
  foodName: string;
  canonicalGroup: CanonicalGroup;
  sectionTitle?: string;
}

export function mapToGrocerySection(
  item: GrocerySectionInput,
  rules?: {
    foodIdOverrides?: Record<string, string>;
  },
): string {
  const group = item.canonicalGroup;
  const section = (item.sectionTitle ?? "").toLowerCase();
  const name = (item.foodName ?? "").toLowerCase();

  const overrideSection = rules?.foodIdOverrides?.[item.foodId];
  if (overrideSection) {
    return overrideSection;
  }

  // Canned/packaged items go to Pantry
  if (
    name.includes("canned") ||
    name.includes("jarred") ||
    name.includes("boxed") ||
    name.includes("powder")
  ) {
    return "Pantry";
  }

  // Produce
  if (
    group === "vegetables" ||
    section.includes("vegetable") ||
    section.includes("fruit") ||
    section.includes("starchy")
  ) {
    return "Produce";
  }

  // Proteins
  if (group === "protein") {
    if (
      section.includes("fish") ||
      section.includes("seafood") ||
      section.includes("shellfish")
    ) {
      return "Seafood";
    }
    if (
      section.includes("meat") ||
      section.includes("poultry") ||
      section.includes("deli")
    ) {
      return "Meat & Deli";
    }
    if (
      section.includes("dairy") ||
      section.includes("cheese") ||
      section.includes("cottage")
    ) {
      return "Dairy";
    }
    if (section.includes("egg")) {
      return "Dairy";
    }
    if (section.includes("plant") || section.includes("legume")) {
      return "Pantry";
    }
    return "Proteins";
  }

  // Carbs
  if (group === "carbs") {
    if (section.includes("grain") || section.includes("legume")) {
      return "Pantry";
    }
    if (section.includes("fruit")) {
      return "Produce";
    }
    return "Pantry";
  }

  // Fats
  if (group === "fats") {
    if (section.includes("seed") || section.includes("nut")) {
      return "Pantry";
    }
    return "Pantry";
  }

  return "Other";
}

export const GROCERY_SECTION_ORDER = [
  "Produce",
  "Dairy",
  "Meat & Deli",
  "Seafood",
  "Pantry",
  "Other",
];

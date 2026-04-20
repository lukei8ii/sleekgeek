import type {
  FoodEntry,
  PlannedMeal,
  PlannedPick,
  ShoppingListItem,
} from "../types/models";
import { GROCERY_SECTION_ORDER } from "./grocerySections";

export function formatMealPlanAsMarkdown(
  plan: PlannedMeal[],
  foodsById: Map<string, FoodEntry>,
  getAmount: (food: FoodEntry | undefined, pick: PlannedPick) => string,
): string {
  const lines: string[] = [];

  const groupedByDay = new Map<number, PlannedMeal[]>();
  for (const meal of plan) {
    const existing = groupedByDay.get(meal.day) ?? [];
    groupedByDay.set(meal.day, [...existing, meal]);
  }

  for (const day of Array.from(groupedByDay.keys()).sort((a, b) => a - b)) {
    lines.push(`DAY ${day}`);
    const mealsForDay = groupedByDay.get(day)!;

    for (const meal of mealsForDay) {
      lines.push(`  Meal ${meal.mealNumber}`);

      for (const pick of meal.picks) {
        const food = foodsById.get(pick.foodId);
        const amount = getAmount(food, pick);
        const label = pick.group.charAt(0).toUpperCase() + pick.group.slice(1);
        if (food) {
          lines.push(
            `    ${label}: ${food.name}${amount ? ` • ${amount}` : ""}`,
          );
        }
      }

      lines.push(""); // blank line between meals
    }
  }

  return lines.join("\n");
}

export function formatShoppingListAsMarkdown(
  items: ShoppingListItem[],
): string {
  const lines: string[] = [];
  const groupedByGrocery = new Map<string, ShoppingListItem[]>();

  for (const item of items) {
    const section = item.grocerySection;
    const existing = groupedByGrocery.get(section) ?? [];
    groupedByGrocery.set(section, [...existing, item]);
  }

  // Sort by a sensible grocery store layout
  const sortedSections = GROCERY_SECTION_ORDER.filter((s) =>
    groupedByGrocery.has(s),
  );

  for (const section of sortedSections) {
    lines.push(section.toUpperCase());

    const itemsInSection = groupedByGrocery.get(section)!;
    for (const item of itemsInSection) {
      const quantity =
        item.quantityDisplay ?? `${item.servingsNeeded} servings`;
      lines.push(`  ${item.foodName} • ${quantity}`);
    }

    lines.push(""); // blank line between sections
  }

  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

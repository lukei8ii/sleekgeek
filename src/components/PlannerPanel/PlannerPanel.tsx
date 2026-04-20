import { useState } from "react";
import type {
  CanonicalGroup,
  FoodEntry,
  MealTemplate,
  PlannedMeal,
  PlannedPick,
  PlannerOptions,
  PortionProfile,
} from "../../types/models";
import { copyToClipboard, formatMealPlanAsMarkdown } from "../../lib/clipboard";
import styles from "./PlannerPanel.module.css";

const BASE_TEMPLATE_ID = "balanced-plate";
const CATEGORY_ORDER: CanonicalGroup[] = [
  "protein",
  "vegetables",
  "carbs",
  "fats",
];
const CATEGORY_LABELS: Record<CanonicalGroup, string> = {
  protein: "Protein",
  vegetables: "Vegetables",
  carbs: "Carbs",
  fats: "Fats",
};

interface PlannerPanelProps {
  options: PlannerOptions;
  templates: MealTemplate[];
  plan: PlannedMeal[];
  foodsById: Map<string, FoodEntry>;
  portionProfile: PortionProfile | null;
  onOptionsChange: (next: PlannerOptions) => void;
  onGenerate: () => void;
}

export function PlannerPanel({
  options,
  templates,
  plan,
  foodsById,
  portionProfile,
  onOptionsChange,
  onGenerate,
}: PlannerPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [foodSearch, setFoodSearch] = useState("");
  const totalMeals = options.days * options.mealsPerDay;
  const sortedFoods = Array.from(foodsById.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const templatesById = new Map(
    templates.map((template) => [template.id, template]),
  );
  const includedFoodIds = new Set(
    options.includedFoods.map((item) => item.foodId),
  );
  const consumedIncludedPortions = new Map<string, number>();
  for (const meal of plan) {
    for (const pick of meal.picks) {
      if (!includedFoodIds.has(pick.foodId)) continue;
      const current = consumedIncludedPortions.get(pick.foodId) ?? 0;
      consumedIncludedPortions.set(
        pick.foodId,
        current + (pick.portionMultiplier ?? 1),
      );
    }
  }
  const totalRemainingIncludedPortions = options.includedFoods.reduce(
    (sum, item) =>
      sum +
      Math.max(
        0,
        item.portions - (consumedIncludedPortions.get(item.foodId) ?? 0),
      ),
    0,
  );
  const searchQuery = foodSearch.trim().toLowerCase();
  const searchResults =
    searchQuery.length === 0
      ? []
      : sortedFoods
          .filter(
            (food) =>
              !includedFoodIds.has(food.id) &&
              (food.name.toLowerCase().includes(searchQuery) ||
                food.sectionTitle.toLowerCase().includes(searchQuery)),
          )
          .slice(0, 8);

  function setCategoryLimit(
    group: keyof PlannerOptions["maxFoodsPerCategory"],
    value: number,
  ) {
    onOptionsChange({
      ...options,
      maxFoodsPerCategory: {
        ...options.maxFoodsPerCategory,
        [group]: Math.max(1, Math.min(12, value || 1)),
      },
    });
  }

  function addIncludedFood(foodId: string) {
    if (includedFoodIds.has(foodId)) return;
    onOptionsChange({
      ...options,
      includedFoods: [...options.includedFoods, { foodId, portions: 1 }],
    });
    setFoodSearch("");
  }

  function updateIncludedFoodPortions(foodId: string, portions: number) {
    onOptionsChange({
      ...options,
      includedFoods: options.includedFoods.map((item) =>
        item.foodId === foodId
          ? { ...item, portions: Math.max(0.5, Number(portions) || 0.5) }
          : item,
      ),
    });
  }

  function removeIncludedFood(foodId: string) {
    onOptionsChange({
      ...options,
      includedFoods: options.includedFoods.filter(
        (item) => item.foodId !== foodId,
      ),
    });
  }

  function clearIncludedFoods() {
    onOptionsChange({
      ...options,
      includedFoods: [],
    });
    setFoodSearch("");
  }

  function formatIncludedFoodAmount(food: FoodEntry, portions: number): string {
    const categoryPortion =
      portionProfile?.categoryPortions[food.canonicalGroup];
    const quantityUnitOverride =
      portionProfile?.shoppingList?.quantityUnitOverrides?.[food.id];
    const quantityUnitSizeOverride =
      portionProfile?.shoppingList?.quantityUnitSizeOverrides?.[food.id];
    const forceWeightBased =
      portionProfile?.shoppingList?.weightBasedFoodIds?.includes(food.id) ??
      false;
    const forceUnitlessCount =
      portionProfile?.shoppingList?.unitlessCountFoodIds?.includes(food.id) ??
      false;
    const isFruit =
      food.canonicalGroup === "carbs" &&
      food.sectionTitle.toLowerCase().includes("fruit");
    const isProduce = food.canonicalGroup === "vegetables" || isFruit;
    const produceUnit =
      portionProfile?.shoppingList?.produceUnitOverrides?.[food.id];
    const portionsPerMeal = portionProfile?.portionsPerMeal ?? 1;
    const weightedPortions = portions * portionsPerMeal;

    if (forceUnitlessCount) {
      return `${Math.ceil(portions)} total`;
    }

    if (quantityUnitOverride) {
      const targetOunces = categoryPortion
        ? categoryPortion.ounces * portions
        : null;
      const targetGrams = categoryPortion
        ? categoryPortion.grams * portions
        : null;
      let count = portions;
      if (
        quantityUnitSizeOverride?.ouncesPerUnit &&
        targetOunces &&
        targetOunces > 0
      ) {
        count = Math.ceil(
          targetOunces / quantityUnitSizeOverride.ouncesPerUnit,
        );
      } else if (
        quantityUnitSizeOverride?.gramsPerUnit &&
        targetGrams &&
        targetGrams > 0
      ) {
        count = Math.ceil(targetGrams / quantityUnitSizeOverride.gramsPerUnit);
      } else {
        count = portions;
      }
      return `${count} ${quantityUnitOverride}`;
    }

    if (isProduce && !forceWeightBased) {
      if (!produceUnit) {
        return `${Math.ceil(weightedPortions)} total`;
      }
      const targetOunces = categoryPortion
        ? categoryPortion.ounces * portions
        : null;
      const targetGrams = categoryPortion
        ? categoryPortion.grams * portions
        : null;
      let count = weightedPortions;
      if (
        quantityUnitSizeOverride?.ouncesPerUnit &&
        targetOunces &&
        targetOunces > 0
      ) {
        count = Math.ceil(
          targetOunces / quantityUnitSizeOverride.ouncesPerUnit,
        );
      } else if (
        quantityUnitSizeOverride?.gramsPerUnit &&
        targetGrams &&
        targetGrams > 0
      ) {
        count = Math.ceil(targetGrams / quantityUnitSizeOverride.gramsPerUnit);
      }
      return `${Math.ceil(count)} ${produceUnit}`;
    }

    if (categoryPortion) {
      const ounces = Number((categoryPortion.ounces * portions).toFixed(1));
      const grams = Math.round(categoryPortion.grams * portions);
      return `${ounces} oz / ${grams} g`;
    }

    return `${food.defaultPortion.amount * portions} ${food.defaultPortion.unit}`;
  }

  function getPickAmount(
    food: FoodEntry | undefined,
    pick: PlannedPick,
  ): string {
    if (!food) return "";

    const categoryPortion =
      portionProfile?.categoryPortions[food.canonicalGroup];
    const portionMultiplier = pick.portionMultiplier ?? 1;
    const portionsPerMeal = portionProfile?.portionsPerMeal ?? 1;
    const isSingleServing =
      portionProfile?.shoppingList?.singleServingFoodIds?.includes(food.id) ??
      false;
    const quantityUnitOverride =
      portionProfile?.shoppingList?.quantityUnitOverrides?.[food.id];
    const quantityUnitSizeOverride =
      portionProfile?.shoppingList?.quantityUnitSizeOverrides?.[food.id];
    const forceWeightBased =
      portionProfile?.shoppingList?.weightBasedFoodIds?.includes(food.id) ??
      false;
    const forceUnitlessCount =
      portionProfile?.shoppingList?.unitlessCountFoodIds?.includes(food.id) ??
      false;
    const isFruit =
      food.canonicalGroup === "carbs" &&
      food.sectionTitle.toLowerCase().includes("fruit");
    const isProduce = food.canonicalGroup === "vegetables" || isFruit;

    if (quantityUnitOverride) {
      const targetOunces = categoryPortion
        ? categoryPortion.ounces * portionMultiplier
        : null;
      const targetGrams = categoryPortion
        ? categoryPortion.grams * portionMultiplier
        : null;
      let count = isSingleServing ? 1 : portionsPerMeal;

      if (
        quantityUnitSizeOverride?.ouncesPerUnit &&
        targetOunces &&
        targetOunces > 0
      ) {
        count = Math.ceil(
          targetOunces / quantityUnitSizeOverride.ouncesPerUnit,
        );
      } else if (
        quantityUnitSizeOverride?.gramsPerUnit &&
        targetGrams &&
        targetGrams > 0
      ) {
        count = Math.ceil(targetGrams / quantityUnitSizeOverride.gramsPerUnit);
      }

      return `${count} ${quantityUnitOverride}`;
    }

    if (forceUnitlessCount) {
      return `${Math.ceil(portionMultiplier)}`;
    }

    if (isProduce && !forceWeightBased) {
      const produceUnit =
        portionProfile?.shoppingList?.produceUnitOverrides?.[food.id];
      if (!produceUnit) return String(portionsPerMeal);

      const targetOunces = categoryPortion
        ? categoryPortion.ounces * portionMultiplier
        : null;
      const targetGrams = categoryPortion
        ? categoryPortion.grams * portionMultiplier
        : null;

      let count = portionsPerMeal;
      if (
        quantityUnitSizeOverride?.ouncesPerUnit &&
        targetOunces &&
        targetOunces > 0
      ) {
        count = Math.ceil(
          targetOunces / quantityUnitSizeOverride.ouncesPerUnit,
        );
      } else if (
        quantityUnitSizeOverride?.gramsPerUnit &&
        targetGrams &&
        targetGrams > 0
      ) {
        count = Math.ceil(targetGrams / quantityUnitSizeOverride.gramsPerUnit);
      }

      return `${count} ${produceUnit}`;
    }

    if (categoryPortion) {
      const ounces = Number(
        (categoryPortion.ounces * portionMultiplier).toFixed(1),
      );
      const grams = Math.round(categoryPortion.grams * portionMultiplier);
      return `${ounces} oz / ${grams} g`;
    }

    return `${food.defaultPortion.amount} ${food.defaultPortion.unit}`;
  }

  function formatPortions(value: number): string {
    const rounded = Number(value.toFixed(2));
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  function getMealDebugTooltip(meal: PlannedMeal): string {
    const totals = new Map<CanonicalGroup, number>();
    for (const group of CATEGORY_ORDER) {
      totals.set(group, 0);
    }

    for (const pick of meal.picks) {
      totals.set(
        pick.group,
        (totals.get(pick.group) ?? 0) + (pick.portionMultiplier ?? 1),
      );
    }

    const portionsPerMeal = Math.max(1, portionProfile?.portionsPerMeal ?? 1);
    const lines = ["Portions by category (actual / target)"];

    for (const group of CATEGORY_ORDER) {
      const mealMultiplier =
        portionProfile?.mealPortionMultipliers?.[group]?.[
          String(meal.mealNumber)
        ] ?? 1;
      const target = portionsPerMeal * mealMultiplier;
      const actual = totals.get(group) ?? 0;
      lines.push(
        `${CATEGORY_LABELS[group]}: ${formatPortions(actual)} / ${formatPortions(target)}`,
      );
    }

    return lines.join("\n");
  }

  async function handleCopyPlan() {
    const markdown = formatMealPlanAsMarkdown(plan, foodsById, getPickAmount);
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } else {
      setCopyFeedback("Failed to copy");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }

  return (
    <section className={styles.panel}>
      <header>
        <h2>Planner</h2>
        <p>
          Generate meals by template, schedule, and category variety limits.
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <h3>Schedule</h3>
          <div className={styles.fieldGrid}>
            <label>
              Days
              <input
                type="number"
                min={1}
                max={21}
                value={options.days}
                onChange={(event) =>
                  onOptionsChange({
                    ...options,
                    days: Math.max(
                      1,
                      Math.min(21, Number(event.target.value) || 1),
                    ),
                  })
                }
              />
            </label>

            <label>
              Meals / day
              <input
                type="number"
                min={1}
                max={6}
                value={options.mealsPerDay}
                onChange={(event) =>
                  onOptionsChange({
                    ...options,
                    mealsPerDay: Math.max(
                      1,
                      Math.min(6, Number(event.target.value) || 1),
                    ),
                  })
                }
              />
            </label>
          </div>

          <p className={styles.helperText}>
            Base template is Balanced Plate. Other built-in templates are mixed
            in occasionally at random.
          </p>
        </div>

        <div className={styles.controlGroup}>
          <h3>Variety Limits</h3>
          <div className={styles.fieldGrid}>
            <label>
              Max Proteins
              <input
                type="number"
                min={1}
                max={12}
                value={options.maxFoodsPerCategory.protein}
                onChange={(event) =>
                  setCategoryLimit("protein", Number(event.target.value))
                }
              />
            </label>

            <label>
              Max Vegetables
              <input
                type="number"
                min={1}
                max={12}
                value={options.maxFoodsPerCategory.vegetables}
                onChange={(event) =>
                  setCategoryLimit("vegetables", Number(event.target.value))
                }
              />
            </label>

            <label>
              Max Carbs
              <input
                type="number"
                min={1}
                max={12}
                value={options.maxFoodsPerCategory.carbs}
                onChange={(event) =>
                  setCategoryLimit("carbs", Number(event.target.value))
                }
              />
            </label>

            <label>
              Max Fats
              <input
                type="number"
                min={1}
                max={12}
                value={options.maxFoodsPerCategory.fats}
                onChange={(event) =>
                  setCategoryLimit("fats", Number(event.target.value))
                }
              />
            </label>
          </div>
          <p className={styles.helperText}>
            Higher limits increase variety; lower limits repeat foods more
            often.
          </p>
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.includeHeader}>
            <h3>Include These Foods</h3>
            {options.includedFoods.length > 0 ? (
              <button
                type="button"
                className={styles.clearIncludedFoods}
                onClick={clearIncludedFoods}
              >
                Clear All
              </button>
            ) : null}
          </div>
          <p className={styles.helperText}>
            Add foods you already have. The planner will use these portions
            first.
          </p>
          {options.includedFoods.length > 0 ? (
            <p className={styles.remainingSummary}>
              Remaining after current plan:
              <span className={styles.remainingBadge}>
                {Number(totalRemainingIncludedPortions.toFixed(1))} portions
              </span>
            </p>
          ) : null}
          <div className={styles.includeSearchRow}>
            <input
              type="search"
              placeholder="Search foods..."
              value={foodSearch}
              onChange={(event) => setFoodSearch(event.target.value)}
            />
          </div>

          {searchResults.length > 0 ? (
            <ul className={styles.searchResults}>
              {searchResults.map((food) => (
                <li key={food.id}>
                  <button
                    type="button"
                    onClick={() => addIncludedFood(food.id)}
                  >
                    <span>{food.name}</span>
                    <small>{food.groupLabel}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {options.includedFoods.length > 0 ? (
            <ul className={styles.includedFoodsList}>
              {options.includedFoods.map((item) => {
                const food = foodsById.get(item.foodId);
                if (!food) return null;
                const preview = formatIncludedFoodAmount(food, item.portions);
                const consumed = consumedIncludedPortions.get(item.foodId) ?? 0;
                const remaining = Math.max(0, item.portions - consumed);
                return (
                  <li key={item.foodId}>
                    <div className={styles.includedFoodMeta}>
                      <strong>{food.name}</strong>
                      <span>
                        {preview}
                        <span className={styles.remainingBadge}>
                          Remaining {Number(remaining.toFixed(1))}
                        </span>
                      </span>
                    </div>
                    <label>
                      Portions
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={item.portions}
                        onChange={(event) =>
                          updateIncludedFoodPortions(
                            item.foodId,
                            Number(event.target.value),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={styles.removeIncludedFood}
                      onClick={() => removeIncludedFood(item.foodId)}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.emptyIncludedFoods}>No foods added yet.</p>
          )}
        </div>

        <div className={styles.actions}>
          <p className={styles.meta}>
            This setup generates <strong>{totalMeals}</strong> meals.
          </p>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.copyButton}
              onClick={handleCopyPlan}
              disabled={plan.length === 0}
              title="Copy plan as markdown to clipboard"
            >
              {copyFeedback || "Copy Plan"}
            </button>
            <button
              type="button"
              className={styles.generateButton}
              onClick={onGenerate}
            >
              Generate Plan
            </button>
          </div>
        </div>
      </div>

      <ul className={styles.planList}>
        {plan.map((meal) => (
          <li
            key={meal.id}
            className={styles.mealCard}
            title={getMealDebugTooltip(meal)}
          >
            <header>
              <strong>
                Day {meal.day} · Meal {meal.mealNumber}
              </strong>
            </header>
            {(() => {
              const mealTemplate = templatesById.get(meal.templateId);
              const fixedCount = Math.min(
                meal.picks.length,
                mealTemplate?.fixedPicks?.length ?? 0,
              );
              const showTemplateGrouping =
                meal.templateId !== BASE_TEMPLATE_ID && fixedCount > 0;
              const templatePicks = showTemplateGrouping
                ? meal.picks.slice(0, fixedCount)
                : [];
              const additionalPicks = showTemplateGrouping
                ? meal.picks.slice(fixedCount)
                : meal.picks;

              const renderPickRows = (picks: typeof meal.picks) => (
                <ul>
                  {picks.map((pick) => {
                    const food = foodsById.get(pick.foodId);
                    const amount = getPickAmount(food, pick);
                    return (
                      <li
                        className={styles.planRow}
                        key={`${meal.id}-${pick.foodId}-${pick.group}`}
                      >
                        <span className={styles.rowLabel}>{pick.group}</span>
                        <strong className={styles.rowFood}>
                          {food?.name ?? "Unknown"}
                        </strong>
                        {amount ? (
                          <span className={styles.rowAmount}>{amount}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              );

              if (!showTemplateGrouping) {
                return renderPickRows(additionalPicks);
              }

              return (
                <>
                  <div className={styles.mealSubgroup}>
                    <p className={styles.mealSubgroupTitle}>
                      {mealTemplate?.name ?? "Template"}
                    </p>
                    {renderPickRows(templatePicks)}
                  </div>
                  {additionalPicks.length > 0 ? (
                    <div className={styles.mealSubgroup}>
                      <p className={styles.mealSubgroupTitle}>Additional</p>
                      {renderPickRows(additionalPicks)}
                    </div>
                  ) : null}
                </>
              );
            })()}
          </li>
        ))}
      </ul>
    </section>
  );
}

import type {
  CanonicalGroup,
  FoodEntry,
  MealTemplate,
  PlannedMeal,
  PlannedPick,
  PlannerOptions,
  PortionProfile,
  ShoppingListItem,
} from "../types/models";
import { mapToGrocerySection } from "./grocerySections";

const BASE_TEMPLATE_ID = "balanced-plate";
const ADDITIONAL_TEMPLATE_PICK_PROBABILITY = 0.25;
const DEFAULT_BASELINE_GROUPS: CanonicalGroup[] = [
  "protein",
  "vegetables",
  "carbs",
  "fats",
];

function includesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function isConfiguredOilFood(
  food: FoodEntry,
  oilRule: NonNullable<
    NonNullable<
      NonNullable<PortionProfile["mealGeneration"]>["fatRules"]
    >["oilFoods"]
  >,
): boolean {
  if (oilRule.foodIds?.includes(food.id)) return true;
  if (
    oilRule.nameKeywords &&
    includesAnyKeyword(food.name, oilRule.nameKeywords)
  ) {
    return true;
  }
  if (
    oilRule.sectionKeywords &&
    includesAnyKeyword(food.sectionTitle, oilRule.sectionKeywords)
  ) {
    return true;
  }
  return false;
}

function mealAllowsOil(
  pickedFoods: FoodEntry[],
  allowRule: NonNullable<
    NonNullable<
      NonNullable<PortionProfile["mealGeneration"]>["fatRules"]
    >["allowOilWhen"]
  >,
): boolean {
  const hasMatchingProtein = pickedFoods.some((food) => {
    if (food.canonicalGroup !== "protein") return false;
    if (allowRule.proteinFoodIds?.includes(food.id)) return true;
    return Boolean(
      allowRule.proteinSectionKeywords &&
      includesAnyKeyword(food.sectionTitle, allowRule.proteinSectionKeywords),
    );
  });

  if (hasMatchingProtein) return true;

  const hasMatchingVegetable = pickedFoods.some((food) => {
    if (food.canonicalGroup !== "vegetables") return false;
    if (allowRule.vegetableFoodIds?.includes(food.id)) return true;
    return Boolean(
      allowRule.vegetableSectionKeywords &&
      includesAnyKeyword(food.sectionTitle, allowRule.vegetableSectionKeywords),
    );
  });

  return hasMatchingVegetable;
}

function mealRequiresOneOil(
  pickedFoods: FoodEntry[],
  requireRule: NonNullable<
    NonNullable<
      NonNullable<PortionProfile["mealGeneration"]>["fatRules"]
    >["requireOneOilWhen"]
  >,
): boolean {
  const hasMatchingProtein = pickedFoods.some((food) => {
    if (food.canonicalGroup !== "protein") return false;
    if (requireRule.proteinFoodIds?.includes(food.id)) return true;
    return Boolean(
      requireRule.proteinSectionKeywords &&
      includesAnyKeyword(food.sectionTitle, requireRule.proteinSectionKeywords),
    );
  });

  if (hasMatchingProtein) return true;

  const hasMatchingVegetable = pickedFoods.some((food) => {
    if (food.canonicalGroup !== "vegetables") return false;
    if (requireRule.vegetableFoodIds?.includes(food.id)) return true;
    return Boolean(
      requireRule.vegetableSectionKeywords &&
      includesAnyKeyword(
        food.sectionTitle,
        requireRule.vegetableSectionKeywords,
      ),
    );
  });

  return hasMatchingVegetable;
}

function randomScore(base: number): number {
  return base * (0.9 + Math.random() * 0.2);
}

function pickFood(
  candidates: FoodEntry[],
  usage: Map<string, number>,
): FoodEntry {
  let best = candidates[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const food of candidates) {
    const used = usage.get(food.id) ?? 0;
    const base = 1 / (1 + used);
    const score = randomScore(base);

    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }

  return best;
}

function pickWeightedCandidates(candidates: FoodEntry[]): FoodEntry[] {
  const green = candidates.filter((food) => food.list === "green");
  const orange = candidates.filter((food) => food.list === "orange");

  if (green.length > 0 && orange.length > 0) {
    return Math.random() < 0.8 ? green : orange;
  }

  if (green.length > 0) return green;
  if (orange.length > 0) return orange;
  return candidates;
}

function pickPreferredFood(
  candidates: FoodEntry[],
  usage: Map<string, number>,
  remainingIncludedPortions: Map<string, number>,
): FoodEntry {
  const preferred = candidates.filter(
    (food) => (remainingIncludedPortions.get(food.id) ?? 0) > 0,
  );
  return pickFood(preferred.length > 0 ? preferred : candidates, usage);
}

export function generatePlan(params: {
  foods: FoodEntry[];
  templates: MealTemplate[];
  options: PlannerOptions;
  portionProfile?: PortionProfile | null;
}): PlannedMeal[] {
  const { foods, templates, options, portionProfile } = params;
  const baseTemplate =
    templates.find((item) => item.id === BASE_TEMPLATE_ID) ?? templates[0];

  if (!baseTemplate) return [];
  const additionalTemplates = templates.filter(
    (template) => template.id !== baseTemplate.id,
  );
  const baselineGroups =
    baseTemplate.groupTargets && baseTemplate.groupTargets.length > 0
      ? baseTemplate.groupTargets
      : DEFAULT_BASELINE_GROUPS;

  const allowedLists = ["green", "orange"];
  const foodById = new Map(foods.map((food) => [food.id, food]));

  const usage = new Map<string, number>();
  const remainingIncludedPortions = new Map<string, number>();
  for (const item of options.includedFoods ?? []) {
    if (!item.foodId || item.portions <= 0) continue;
    remainingIncludedPortions.set(item.foodId, item.portions);
  }

  const consumeIncludedPortion = (foodId: string, amount: number) => {
    const remaining = remainingIncludedPortions.get(foodId);
    if (remaining === undefined || remaining <= 0) return;
    remainingIncludedPortions.set(foodId, Math.max(0, remaining - amount));
  };

  const selectedFoodIdsByGroup = new Map<CanonicalGroup, Set<string>>();
  const plan: PlannedMeal[] = [];

  for (let day = 1; day <= options.days; day += 1) {
    for (
      let mealNumber = 1;
      mealNumber <= options.mealsPerDay;
      mealNumber += 1
    ) {
      const shouldUseAdditionalTemplate =
        additionalTemplates.length > 0 &&
        Math.random() < ADDITIONAL_TEMPLATE_PICK_PROBABILITY;
      const mealTemplate = shouldUseAdditionalTemplate
        ? additionalTemplates[
            Math.floor(Math.random() * additionalTemplates.length)
          ]
        : baseTemplate;
      const mealPickedFoods: FoodEntry[] = [];

      const fixedPicks: PlannedPick[] = (mealTemplate.fixedPicks ?? []).flatMap(
        (templatePick) => {
          const fixedFood = foods.find(
            (food) => food.id === templatePick.foodId,
          );
          if (!fixedFood || !allowedLists.includes(fixedFood.list)) {
            return [];
          }

          const canonicalGroup =
            (templatePick.group as CanonicalGroup | undefined) ??
            fixedFood.canonicalGroup;
          const portionMultiplier = templatePick.portionMultiplier ?? 1;

          usage.set(fixedFood.id, (usage.get(fixedFood.id) ?? 0) + 1);
          mealPickedFoods.push(fixedFood);
          const selectedIds =
            selectedFoodIdsByGroup.get(canonicalGroup) ?? new Set<string>();
          selectedIds.add(fixedFood.id);
          selectedFoodIdsByGroup.set(canonicalGroup, selectedIds);
          consumeIncludedPortion(fixedFood.id, portionMultiplier);

          return [
            {
              group: canonicalGroup,
              foodId: fixedFood.id,
              portionMultiplier,
            },
          ];
        },
      );
      const fixedFoodIds = new Set(fixedPicks.map((pick) => pick.foodId));
      const fixedTotalsByGroup = new Map<CanonicalGroup, number>();
      for (const pick of fixedPicks) {
        fixedTotalsByGroup.set(
          pick.group,
          (fixedTotalsByGroup.get(pick.group) ?? 0) + pick.portionMultiplier,
        );
      }

      const variablePicks: PlannedPick[] = [];
      for (const group of baselineGroups) {
        const canonicalGroup = group as CanonicalGroup;
        const restrictedVariablePickIds = new Set(
          portionProfile?.mealGeneration?.variablePickRules
            ?.restrictFoodIdsByGroup?.[canonicalGroup] ?? [],
        );
        const portionsPerMeal = Math.max(
          1,
          portionProfile?.portionsPerMeal ?? 1,
        );
        const mealPortionMultiplier =
          portionProfile?.mealPortionMultipliers?.[canonicalGroup]?.[
            String(mealNumber)
          ] ?? 1;
        const targetPortions = portionsPerMeal * mealPortionMultiplier;
        const fixedPortions = fixedTotalsByGroup.get(canonicalGroup) ?? 0;
        const missingPortions = Math.max(0, targetPortions - fixedPortions);

        if (missingPortions <= 0) continue;

        const allCandidates = foods.filter(
          (food) =>
            food.canonicalGroup === canonicalGroup &&
            allowedLists.includes(food.list) &&
            !restrictedVariablePickIds.has(food.id),
        );
        const nonFixedCandidates = allCandidates.filter(
          (food) => !fixedFoodIds.has(food.id),
        );
        let candidates =
          nonFixedCandidates.length > 0 ? nonFixedCandidates : allCandidates;
        if (candidates.length === 0) continue;

        if (canonicalGroup === "fats") {
          const fatRules = portionProfile?.mealGeneration?.fatRules;
          const oilRule = fatRules?.oilFoods;
          const allowOilWhen = fatRules?.allowOilWhen;
          const requireOneOilWhen = fatRules?.requireOneOilWhen;

          const selectedFoodIds =
            selectedFoodIdsByGroup.get(canonicalGroup) ?? new Set<string>();
          const maxFoods = Math.max(
            1,
            options.maxFoodsPerCategory[canonicalGroup] || 1,
          );

          const addFatPick = (food: FoodEntry, portionMultiplier: number) => {
            usage.set(food.id, (usage.get(food.id) ?? 0) + 1);
            selectedFoodIds.add(food.id);
            selectedFoodIdsByGroup.set(canonicalGroup, selectedFoodIds);
            consumeIncludedPortion(food.id, portionMultiplier);
            mealPickedFoods.push(food);
            variablePicks.push({
              group: canonicalGroup,
              foodId: food.id,
              portionMultiplier,
            });
          };

          if (oilRule && allowOilWhen) {
            const oilCandidates = candidates.filter((food) =>
              isConfiguredOilFood(food, oilRule),
            );
            const hasOilCandidates = oilCandidates.length > 0;
            const canUseOil = mealAllowsOil(mealPickedFoods, allowOilWhen);

            if (hasOilCandidates && !canUseOil) {
              const nonOilCandidates = candidates.filter(
                (food) => !isConfiguredOilFood(food, oilRule),
              );
              if (nonOilCandidates.length > 0) {
                candidates = nonOilCandidates;
              }
            }

            const requiresOneOil =
              hasOilCandidates &&
              canUseOil &&
              requireOneOilWhen &&
              mealRequiresOneOil(mealPickedFoods, requireOneOilWhen);

            if (requiresOneOil && missingPortions > 0) {
              const oilPickPool =
                selectedFoodIds.size >= maxFoods
                  ? oilCandidates.filter((food) => selectedFoodIds.has(food.id))
                  : oilCandidates;
              const weightedOilCandidates = pickWeightedCandidates(
                oilPickPool.length > 0 ? oilPickPool : oilCandidates,
              );
              const oilPick = pickPreferredFood(
                weightedOilCandidates,
                usage,
                remainingIncludedPortions,
              );
              addFatPick(oilPick, 1);

              const remainingFatPortions = Math.max(0, missingPortions - 1);
              if (remainingFatPortions <= 0) {
                continue;
              }

              const nonOilCandidates = candidates.filter(
                (food) => !isConfiguredOilFood(food, oilRule),
              );
              const remainingPool =
                nonOilCandidates.length > 0 ? nonOilCandidates : candidates;
              const remainingLimitedPool =
                selectedFoodIds.size >= maxFoods
                  ? remainingPool.filter((food) => selectedFoodIds.has(food.id))
                  : remainingPool;
              const weightedRemainingCandidates = pickWeightedCandidates(
                remainingLimitedPool.length > 0
                  ? remainingLimitedPool
                  : remainingPool,
              );
              const remainingPick = pickPreferredFood(
                weightedRemainingCandidates,
                usage,
                remainingIncludedPortions,
              );

              if (remainingPick.id === oilPick.id) {
                const lastPick = variablePicks[variablePicks.length - 1];
                if (lastPick && lastPick.foodId === oilPick.id) {
                  lastPick.portionMultiplier += remainingFatPortions;
                  consumeIncludedPortion(
                    remainingPick.id,
                    remainingFatPortions,
                  );
                }
              } else {
                addFatPick(remainingPick, remainingFatPortions);
              }

              continue;
            }
          }
        }

        // Primary/supplementary protein split
        const proteinCfg = portionProfile?.proteinConfig;
        if (canonicalGroup === "protein" && proteinCfg) {
          const isSupplementary = (food: FoodEntry) =>
            proteinCfg.supplementaryFoodIds.includes(food.id) ||
            proteinCfg.supplementarySectionKeywords.some((kw) =>
              food.sectionTitle.toLowerCase().includes(kw.toLowerCase()),
            );

          const primaryCandidates = candidates.filter(
            (f) => !isSupplementary(f),
          );
          const supplementaryCandidates = candidates.filter(isSupplementary);

          if (primaryCandidates.length === 0) continue;

          const selectedIds =
            selectedFoodIdsByGroup.get(canonicalGroup) ?? new Set<string>();
          const maxFoods = Math.max(
            1,
            options.maxFoodsPerCategory[canonicalGroup] || 1,
          );

          const limitedPrimary =
            selectedIds.size >= maxFoods
              ? primaryCandidates.filter((f) => selectedIds.has(f.id))
              : primaryCandidates;

          const weightedPrimary = pickWeightedCandidates(
            limitedPrimary.length > 0 ? limitedPrimary : primaryCandidates,
          );
          const primaryPick = pickPreferredFood(
            weightedPrimary,
            usage,
            remainingIncludedPortions,
          );
          usage.set(primaryPick.id, (usage.get(primaryPick.id) ?? 0) + 1);
          selectedIds.add(primaryPick.id);
          selectedFoodIdsByGroup.set(canonicalGroup, selectedIds);

          const mealPicks: PlannedPick[] = [
            {
              group: canonicalGroup,
              foodId: primaryPick.id,
              portionMultiplier: missingPortions,
            },
          ];

          const singleServingIds =
            portionProfile?.shoppingList?.singleServingFoodIds ?? [];
          const isPrimarySingleServing = singleServingIds.includes(
            primaryPick.id,
          );
          const alwaysPairIds = proteinCfg.alwaysPairFoodIds ?? [];
          const mustForceCompanion = alwaysPairIds.includes(primaryPick.id);
          const shouldAddSupplementary =
            supplementaryCandidates.length > 0 &&
            (mustForceCompanion ||
              Math.random() < proteinCfg.supplementaryPickProbability);

          if (shouldAddSupplementary) {
            const weightedSupp = pickWeightedCandidates(
              supplementaryCandidates,
            );
            const suppPick = pickPreferredFood(
              weightedSupp,
              usage,
              remainingIncludedPortions,
            );
            usage.set(suppPick.id, (usage.get(suppPick.id) ?? 0) + 1);
            if (!isPrimarySingleServing) {
              mealPicks[0].portionMultiplier = missingPortions * 0.5;
              mealPicks.push({
                group: canonicalGroup,
                foodId: suppPick.id,
                portionMultiplier: missingPortions * 0.5,
              });
            }
          }

          for (const pick of mealPicks) {
            consumeIncludedPortion(pick.foodId, pick.portionMultiplier ?? 1);
            const pickedFood = foodById.get(pick.foodId);
            if (pickedFood) {
              mealPickedFoods.push(pickedFood);
            }
          }

          variablePicks.push(...mealPicks);
          continue;
        }

        const selectedFoodIds =
          selectedFoodIdsByGroup.get(canonicalGroup) ?? new Set<string>();
        const maxFoods = Math.max(
          1,
          options.maxFoodsPerCategory[canonicalGroup] || 1,
        );

        const limitedCandidates =
          selectedFoodIds.size >= maxFoods
            ? candidates.filter((food) => selectedFoodIds.has(food.id))
            : candidates;

        const weightedCandidates = pickWeightedCandidates(
          limitedCandidates.length > 0 ? limitedCandidates : candidates,
        );
        const picked = pickPreferredFood(
          weightedCandidates,
          usage,
          remainingIncludedPortions,
        );
        usage.set(picked.id, (usage.get(picked.id) ?? 0) + 1);
        selectedFoodIds.add(picked.id);
        selectedFoodIdsByGroup.set(canonicalGroup, selectedFoodIds);

        consumeIncludedPortion(picked.id, mealPortionMultiplier);
        mealPickedFoods.push(picked);

        variablePicks.push({
          group: canonicalGroup,
          foodId: picked.id,
          portionMultiplier: missingPortions,
        });
      }

      const picks = [...fixedPicks, ...variablePicks];

      plan.push({
        id: `d${day}-m${mealNumber}`,
        day,
        mealNumber,
        templateId: mealTemplate.id,
        picks,
      });
    }
  }

  return plan;
}

export function generateShoppingList(
  plan: PlannedMeal[],
  foods: FoodEntry[],
  portionProfile: PortionProfile | null,
): ShoppingListItem[] {
  const foodMap = new Map(foods.map((food) => [food.id, food]));
  const aggregate = new Map<
    string,
    {
      foodId: string;
      foodName: string;
      canonicalGroup: CanonicalGroup;
      sectionTitle: string;
      servingsNeeded: number;
      packageServings: number | null;
    }
  >();

  for (const meal of plan) {
    for (const pick of meal.picks) {
      const food = foodMap.get(pick.foodId);
      if (!food) continue;
      const portionMultiplier = pick.portionMultiplier ?? 1;

      const nameKey = `${food.canonicalGroup}:${food.name.trim().toLowerCase()}`;
      const current = aggregate.get(nameKey);
      const packageServings =
        food.packageSize && food.packageSize.servings > 0
          ? food.packageSize.servings
          : null;

      if (!current) {
        aggregate.set(nameKey, {
          foodId: food.id,
          foodName: food.name,
          canonicalGroup: food.canonicalGroup,
          sectionTitle: food.sectionTitle,
          servingsNeeded: portionMultiplier,
          packageServings,
        });
        continue;
      }

      current.servingsNeeded += portionMultiplier;
      if (current.packageServings === null && packageServings !== null) {
        current.packageServings = packageServings;
      }
    }
  }

  const list: ShoppingListItem[] = [];

  for (const item of aggregate.values()) {
    const portionConfig = portionProfile?.categoryPortions[item.canonicalGroup];
    const excludedFoodIds = new Set(
      portionProfile?.shoppingList?.packageOptimization?.excludeFoodIds ?? [],
    );
    const rawMeatKeywords =
      portionProfile?.shoppingList?.packageOptimization?.rawMeatSectionKeywords?.map(
        (value) => value.toLowerCase(),
      ) ?? ["meat", "poultry", "fish", "seafood", "shellfish"];
    const isRawMeatProteinSection = rawMeatKeywords.some((keyword) =>
      item.sectionTitle.toLowerCase().includes(keyword),
    );
    const packageOptimizationTarget =
      item.canonicalGroup === "protein" &&
      !excludedFoodIds.has(item.foodId) &&
      ((portionProfile?.shoppingList?.packageOptimization
        ?.enabledForRawMeatProteins ?? true)
        ? isRawMeatProteinSection
        : true);
    const isFruit =
      item.canonicalGroup === "carbs" &&
      item.sectionTitle.toLowerCase().includes("fruit");
    const isProduce = item.canonicalGroup === "vegetables" || isFruit;
    const quantityUnitOverride =
      portionProfile?.shoppingList?.quantityUnitOverrides?.[item.foodId];
    const produceUnitOverride =
      portionProfile?.shoppingList?.produceUnitOverrides?.[item.foodId];
    const quantityUnitSizeOverride =
      portionProfile?.shoppingList?.quantityUnitSizeOverrides?.[item.foodId];
    const forceWeightBased =
      portionProfile?.shoppingList?.weightBasedFoodIds?.includes(item.foodId) ??
      false;
    const forceUnitlessCount =
      portionProfile?.shoppingList?.unitlessCountFoodIds?.includes(
        item.foodId,
      ) ?? false;
    const isSingleServing =
      portionProfile?.shoppingList?.singleServingFoodIds?.includes(
        item.foodId,
      ) ?? false;
    const portionsPerMeal = portionProfile?.portionsPerMeal ?? 1;
    const isCountBased =
      ((isProduce || Boolean(quantityUnitOverride)) && !forceWeightBased) ||
      forceUnitlessCount;
    const estimatedPackages =
      packageOptimizationTarget &&
      item.packageServings &&
      item.packageServings > 0
        ? Math.ceil(item.servingsNeeded / item.packageServings)
        : null;

    let quantityDisplay = `${item.servingsNeeded}`;

    if (isCountBased) {
      if (forceUnitlessCount) {
        quantityDisplay = `${Math.ceil(item.servingsNeeded)}`;
      } else {
        const targetOunces = portionConfig
          ? item.servingsNeeded * portionConfig.ounces
          : null;
        const targetGrams = portionConfig
          ? item.servingsNeeded * portionConfig.grams
          : null;

        const baseCount =
          isSingleServing || quantityUnitSizeOverride
            ? item.servingsNeeded
            : item.servingsNeeded * portionsPerMeal;
        let count = baseCount;
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
          count = Math.ceil(
            targetGrams / quantityUnitSizeOverride.gramsPerUnit,
          );
        }

        if (quantityUnitOverride) {
          quantityDisplay = `${count} ${quantityUnitOverride}`;
        } else if (produceUnitOverride) {
          quantityDisplay = `${count} ${produceUnitOverride}`;
        } else {
          quantityDisplay = `${count}`;
        }
      }
    }

    const totalPortionOunces = portionConfig
      ? Number((item.servingsNeeded * portionConfig.ounces).toFixed(1))
      : null;
    const totalPortionGrams = portionConfig
      ? Math.round(item.servingsNeeded * portionConfig.grams)
      : null;

    if (
      !isCountBased &&
      totalPortionOunces !== null &&
      totalPortionGrams !== null
    ) {
      quantityDisplay = `${totalPortionOunces} oz / ${totalPortionGrams} g`;
    }

    const grocerySection = mapToGrocerySection(
      {
        foodId: item.foodId,
        foodName: item.foodName,
        canonicalGroup: item.canonicalGroup,
        sectionTitle: item.sectionTitle,
      },
      portionProfile?.shoppingList?.grocerySectionRules,
    );

    list.push({
      foodId: item.foodId,
      foodName: item.foodName,
      grocerySection,
      canonicalGroup: item.canonicalGroup,
      sectionTitle: item.sectionTitle,
      isProduce,
      isCountBased,
      packageOptimizationTarget,
      servingsNeeded: item.servingsNeeded,
      estimatedPackages,
      totalPortionOunces,
      totalPortionGrams,
      portionLabel: portionConfig?.label,
      quantityDisplay,
    });
  }

  return list.sort((a, b) => b.servingsNeeded - a.servingsNeeded);
}

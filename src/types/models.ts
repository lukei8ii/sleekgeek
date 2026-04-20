export type FoodListColor = "green" | "orange";

export type CanonicalGroup = "protein" | "vegetables" | "carbs" | "fats";

export type GroupToken = CanonicalGroup | string;

export interface Portion {
  amount: number;
  unit: string;
}

export interface PackageSize {
  servings: number;
  unit: string;
}

export interface FoodSource {
  list: string;
  url: string;
}

export interface FoodItem {
  id: string;
  name: string;
  defaultPortion: Portion;
  packageSize: PackageSize | null;
  source: FoodSource;
}

export interface FoodSectionFile {
  list: FoodListColor;
  groupId: string;
  groupLabel: string;
  sections: Array<{
    title: string;
    items: FoodItem[];
  }>;
}

export interface FoodIndexFile {
  source: string;
  generatedAt: string;
  files: Array<{
    file: string;
    list: FoodListColor;
    groupId: string;
    groupLabel: string;
    itemCount: number;
  }>;
}

export interface FoodEntry extends FoodItem {
  list: FoodListColor;
  groupId: string;
  groupLabel: string;
  canonicalGroup: CanonicalGroup;
  sectionTitle: string;
  isCustom: boolean;
  enrichment?: {
    packageSource?: string;
    references?: Array<{
      provider: "public-web" | "usda" | "kroger" | "open-food-facts";
      id: string;
      label?: string;
      url?: string;
    }>;
  };
}

export interface FoodOverlayFile {
  packageOverrides: Array<{
    foodId: string;
    packageSize: PackageSize;
    packageSource: string;
    references?: Array<{
      provider: "public-web" | "usda" | "kroger" | "open-food-facts";
      id: string;
      label?: string;
      url?: string;
    }>;
  }>;
  portionOverrides?: Array<{
    foodId: string;
    defaultPortion: Portion;
  }>;
}

export interface PortionProfile {
  person: {
    sex: string;
    age: number;
    heightInches: number;
    weightPounds: number;
    bodyFatPercent: number;
  };
  portionsPerMeal?: number;
  mealPortionMultipliers?: Partial<
    Record<CanonicalGroup, Record<string, number>>
  >;
  categoryPortions: Record<
    CanonicalGroup,
    {
      label: string;
      ounces: number;
      grams: number;
    }
  >;
  shoppingList?: {
    produceDefaultUnit?: string;
    produceUnitOverrides?: Record<string, string>;
    weightBasedFoodIds?: string[];
    unitlessCountFoodIds?: string[];
    singleServingFoodIds?: string[];
    grocerySectionRules?: {
      foodIdOverrides?: Record<string, string>;
    };
    quantityUnitOverrides?: Record<string, string>;
    quantityUnitSizeOverrides?: Record<
      string,
      {
        ouncesPerUnit?: number;
        gramsPerUnit?: number;
      }
    >;
    packageOptimization?: {
      enabledForRawMeatProteins?: boolean;
      rawMeatSectionKeywords?: string[];
      excludeFoodIds?: string[];
    };
  };
  proteinConfig?: {
    primarySectionKeywords: string[];
    supplementarySectionKeywords: string[];
    supplementaryFoodIds: string[];
    alwaysPairFoodIds?: string[];
    supplementaryPickProbability: number;
  };
  mealGeneration?: {
    variablePickRules?: {
      restrictFoodIdsByGroup?: Partial<Record<CanonicalGroup, string[]>>;
    };
    fatRules?: {
      oilFoods?: {
        foodIds?: string[];
        nameKeywords?: string[];
        sectionKeywords?: string[];
      };
      allowOilWhen?: {
        proteinFoodIds?: string[];
        proteinSectionKeywords?: string[];
        vegetableFoodIds?: string[];
        vegetableSectionKeywords?: string[];
      };
      requireOneOilWhen?: {
        proteinFoodIds?: string[];
        proteinSectionKeywords?: string[];
        vegetableFoodIds?: string[];
        vegetableSectionKeywords?: string[];
      };
    };
  };
}

export interface MealTemplate {
  id: string;
  name: string;
  groupTargets?: GroupToken[];
  fallbackTemplateId?: string;
  fixedPicks?: Array<{
    foodId: string;
    group?: GroupToken;
    portionMultiplier?: number;
  }>;
}

export interface PlannedPick {
  group: CanonicalGroup;
  foodId: string;
  portionMultiplier: number;
}

export interface PlannedMeal {
  id: string;
  day: number;
  mealNumber: number;
  templateId: string;
  picks: PlannedPick[];
}

export interface PlannerOptions {
  days: number;
  mealsPerDay: number;
  templateId: string;
  includeOrange: boolean;
  includedFoods: Array<{
    foodId: string;
    portions: number;
  }>;
  maxFoodsPerCategory: Record<CanonicalGroup, number>;
}

export interface ShoppingListItem {
  foodId: string;
  foodName: string;
  grocerySection: string;
  canonicalGroup: CanonicalGroup;
  sectionTitle?: string;
  isProduce: boolean;
  isCountBased: boolean;
  packageOptimizationTarget: boolean;
  servingsNeeded: number;
  estimatedPackages: number | null;
  totalPortionOunces: number | null;
  totalPortionGrams: number | null;
  portionLabel?: string;
  quantityDisplay?: string;
}

export interface AppBackupData {
  customFoods: FoodEntry[];
  templates: MealTemplate[];
  plan: PlannedMeal[];
}

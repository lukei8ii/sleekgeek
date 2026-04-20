import { useEffect, useMemo, useState } from "react";
import { FoodsPanel } from "../FoodsPanel/FoodsPanel";

import { PanelTabs } from "../PanelTabs/PanelTabs";
import { PlannerPanel } from "../PlannerPanel/PlannerPanel";
import { ShoppingListPanel } from "../ShoppingListPanel/ShoppingListPanel";
import { TemplatesPanel } from "../TemplatesPanel/TemplatesPanel";
import { loadOfficialData } from "../../lib/dataLoader";
import { loadAppBackup, saveAppBackup } from "../../lib/persistence";
import { generatePlan, generateShoppingList } from "../../lib/planner";
import type {
  FoodEntry,
  MealTemplate,
  PlannedMeal,
  PlannerOptions,
  PortionProfile,
} from "../../types/models";
import styles from "./App.module.css";

const tabs = ["Foods", "Templates", "Planner", "Shopping List"];
const DISABLED_TEMPLATE_IDS = new Set(["lower-carb"]);
const BASE_TEMPLATE_ID = "balanced-plate";

const defaultPlannerOptions: PlannerOptions = {
  days: 3,
  mealsPerDay: 3,
  templateId: BASE_TEMPLATE_ID,
  includeOrange: true,
  includedFoods: [],
  maxFoodsPerCategory: {
    protein: 3,
    vegetables: 3,
    carbs: 3,
    fats: 3,
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [officialFoods, setOfficialFoods] = useState<FoodEntry[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodEntry[]>([]);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [plan, setPlan] = useState<PlannedMeal[]>([]);
  const [portionProfile, setPortionProfile] = useState<PortionProfile | null>(
    null,
  );
  const [plannerOptions, setPlannerOptions] = useState<PlannerOptions>(
    defaultPlannerOptions,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const allFoods = useMemo(
    () => [...officialFoods, ...customFoods],
    [officialFoods, customFoods],
  );

  const activeTemplates = useMemo(
    () =>
      templates.filter((template) => !DISABLED_TEMPLATE_IDS.has(template.id)),
    [templates],
  );

  const foodsById = useMemo(() => {
    return new Map(allFoods.map((food) => [food.id, food]));
  }, [allFoods]);

  const shoppingList = useMemo(
    () => generateShoppingList(plan, allFoods, portionProfile),
    [plan, allFoods, portionProfile],
  );

  useEffect(() => {
    let canceled = false;

    async function boot() {
      try {
        const [official, backup] = await Promise.all([
          loadOfficialData(),
          Promise.resolve(loadAppBackup()),
        ]);
        if (canceled) return;

        setOfficialFoods(official.foods);
        setPortionProfile(official.portionProfile);
        setCustomFoods(backup?.customFoods ?? []);
        setTemplates(
          official.templates.filter(
            (template) => !DISABLED_TEMPLATE_IDS.has(template.id),
          ),
        );
        setPlan(backup?.plan ?? []);

        const initialTemplateId =
          official.templates.find(
            (template) =>
              !DISABLED_TEMPLATE_IDS.has(template.id) &&
              template.id === BASE_TEMPLATE_ID,
          )?.id ||
          official.templates.find(
            (template) => !DISABLED_TEMPLATE_IDS.has(template.id),
          )?.id ||
          "";
        setPlannerOptions((current) => ({
          ...current,
          templateId: initialTemplateId,
        }));
      } catch {
        if (!canceled) {
          setError("Failed to load initial data files.");
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }

    boot();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    saveAppBackup({
      customFoods,
      templates,
      plan,
    });
  }, [customFoods, templates, plan, isLoading]);

  function runPlanGeneration() {
    const nextPlan = generatePlan({
      foods: allFoods,
      templates: activeTemplates,
      options: {
        ...plannerOptions,
        templateId: BASE_TEMPLATE_ID,
      },
      portionProfile,
    });

    setPlan(nextPlan);
  }

  if (isLoading) {
    return <main className={styles.loading}>Loading v1 data…</main>;
  }

  if (error) {
    return <main className={styles.loading}>{error}</main>;
  }

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <div>
          <h1>Sleekgeek Meal Builder</h1>
          <p>
            Frontend-only v1 with official food-list JSON files, custom
            templates, and plan generation.
          </p>
        </div>
      </header>

      <PanelTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <section className={styles.content}>
        {activeTab === "Foods" && <FoodsPanel foods={allFoods} />}

        {activeTab === "Templates" && (
          <TemplatesPanel templates={activeTemplates} foodsById={foodsById} />
        )}

        {activeTab === "Planner" && (
          <PlannerPanel
            options={plannerOptions}
            templates={activeTemplates}
            plan={plan}
            foodsById={foodsById}
            portionProfile={portionProfile}
            onOptionsChange={setPlannerOptions}
            onGenerate={runPlanGeneration}
          />
        )}

        {activeTab === "Shopping List" && (
          <ShoppingListPanel items={shoppingList} />
        )}
      </section>
    </main>
  );
}

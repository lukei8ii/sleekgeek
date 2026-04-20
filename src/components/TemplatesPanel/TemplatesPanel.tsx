import type { FoodEntry, MealTemplate } from "../../types/models";
import styles from "./TemplatesPanel.module.css";

const BASE_TEMPLATE_ID = "balanced-plate";

interface TemplatesPanelProps {
  templates: MealTemplate[];
  foodsById: Map<string, FoodEntry>;
}

export function TemplatesPanel({ templates, foodsById }: TemplatesPanelProps) {
  const bundleTemplates = templates.filter(
    (template) => template.id !== BASE_TEMPLATE_ID,
  );

  function getTemplateSummary(template: MealTemplate): string {
    if (template.fixedPicks && template.fixedPicks.length > 0) {
      return template.fixedPicks
        .map((pick) => {
          const foodName = foodsById.get(pick.foodId)?.name ?? pick.foodId;
          if (pick.portionMultiplier && pick.portionMultiplier !== 1) {
            return `${foodName} (${pick.portionMultiplier}x)`;
          }
          return foodName;
        })
        .join(" + ");
    }

    return (template.groupTargets ?? []).join(" + ");
  }

  return (
    <section className={styles.panel}>
      <header>
        <h2>Templates</h2>
        <p>
          Baseline meal structure is fixed to SleekGeek (Balanced Plate). These
          are optional add-on ingredient bundles that can be mixed in
          occasionally.
        </p>
      </header>

      <ul className={styles.templateList}>
        {bundleTemplates.map((template) => (
          <li key={template.id}>
            <div>
              <strong>{template.name}</strong>
              <span>{getTemplateSummary(template)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

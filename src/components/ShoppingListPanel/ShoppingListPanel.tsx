import { useState } from "react";
import type { ShoppingListItem } from "../../types/models";
import {
  copyToClipboard,
  formatShoppingListAsMarkdown,
} from "../../lib/clipboard";
import { GROCERY_SECTION_ORDER } from "../../lib/grocerySections";
import styles from "./ShoppingListPanel.module.css";

interface ShoppingListPanelProps {
  items: ShoppingListItem[];
}

export function ShoppingListPanel({ items }: ShoppingListPanelProps) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function handleCopyList() {
    const markdown = formatShoppingListAsMarkdown(items);
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
        <h2>Shopping List</h2>
        <p>
          Ingredients are aggregated from your generated meals. Package counts
          appear when package data exists, and approximate buy amounts use your
          portion profile config.
        </p>
        <button
          type="button"
          onClick={handleCopyList}
          disabled={items.length === 0}
          title="Copy list as markdown to clipboard"
          style={{ marginTop: "0.5rem" }}
        >
          {copyFeedback || "Copy List"}
        </button>
      </header>

      <ul className={styles.list}>
        {(() => {
          const groupedBySection = new Map<string, ShoppingListItem[]>();
          for (const item of items) {
            const section = item.grocerySection;
            const existing = groupedBySection.get(section) ?? [];
            groupedBySection.set(section, [...existing, item]);
          }

          const sections = GROCERY_SECTION_ORDER.filter((s) =>
            groupedBySection.has(s),
          );

          return sections.flatMap((section) => {
            const sectionItems = groupedBySection.get(section)!;
            return [
              <li key={`section-${section}`} className={styles.sectionHeader}>
                <strong>{section}</strong>
              </li>,
              ...sectionItems.map((item) => (
                <li key={item.foodId}>
                  {item.foodName} •{" "}
                  {item.quantityDisplay ?? `${item.servingsNeeded}`}
                </li>
              )),
            ];
          });
        })()}
      </ul>
    </section>
  );
}

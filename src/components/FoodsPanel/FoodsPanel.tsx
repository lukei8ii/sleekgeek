import { useMemo, useState } from "react";
import type { FoodEntry } from "../../types/models";
import styles from "./FoodsPanel.module.css";

interface FoodsPanelProps {
  foods: FoodEntry[];
}

export function FoodsPanel({ foods }: FoodsPanelProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return foods;

    return foods.filter((food) => {
      return (
        food.name.toLowerCase().includes(query) ||
        food.groupLabel.toLowerCase().includes(query) ||
        food.sectionTitle.toLowerCase().includes(query) ||
        food.list.toLowerCase().includes(query)
      );
    });
  }, [foods, search]);

  const counts = useMemo(() => {
    return {
      green: foods.filter((food) => food.list === "green").length,
      orange: foods.filter((food) => food.list === "orange").length,
      custom: foods.filter((food) => food.isCustom).length,
    };
  }, [foods]);

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2>Foods</h2>
        <p>
          Official Sleekgeek food list imported from their Google Sheet and
          split into editable JSON files.
        </p>
      </header>

      <div className={styles.metaGrid}>
        <article>
          <strong>{counts.green}</strong>
          <span>Green</span>
        </article>
        <article>
          <strong>{counts.orange}</strong>
          <span>Orange</span>
        </article>
        <article>
          <strong>{counts.custom}</strong>
          <span>Custom</span>
        </article>
      </div>

      <div className={styles.tools}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search foods, groups, or lists"
        />
      </div>

      <ul className={styles.foodList}>
        {filtered.map((food) => (
          <li
            key={`${food.list}-${food.groupId}-${food.sectionTitle}-${food.name}`}
          >
            <div>
              <strong>{food.name}</strong>
              <span>
                {food.groupLabel} • {food.list}
                {food.isCustom ? " • custom" : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

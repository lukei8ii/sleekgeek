import styles from "./PanelTabs.module.css";

interface PanelTabsProps {
  tabs: string[];
  active: string;
  onChange: (next: string) => void;
}

export function PanelTabs({ tabs, active, onChange }: PanelTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="Panels">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={
            tab === active ? `${styles.tab} ${styles.tabActive}` : styles.tab
          }
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

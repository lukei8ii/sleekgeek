import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1w_ptQQviShrkHXqOx1PvV2XvLwpPtL_M1qOQ2zuKaWw/export?format=csv&gid=0";

const OUTPUT_DIR = path.resolve(process.cwd(), "public/data/foods");

const columnMap = [
  {
    index: 2,
    list: "green",
    groupId: "quality-protein",
    groupLabel: "Quality Protein",
  },
  {
    index: 4,
    list: "green",
    groupId: "colourful-vegetables",
    groupLabel: "Colourful Vegetables",
  },
  {
    index: 6,
    list: "green",
    groupId: "smart-carbs",
    groupLabel: "Smart Carbs",
  },
  {
    index: 8,
    list: "green",
    groupId: "healthy-fats",
    groupLabel: "Healthy Fats",
  },
  { index: 12, list: "orange", groupId: "protein", groupLabel: "Protein" },
  {
    index: 14,
    list: "orange",
    groupId: "vegetables",
    groupLabel: "Vegetables",
  },
  { index: 16, list: "orange", groupId: "carbs", groupLabel: "Carbs" },
  { index: 18, list: "orange", groupId: "fats", groupLabel: "Fats" },
];

const skipPatterns = [
  /^more info at/i,
  /^notes on /i,
  /^reminder that/i,
  /^under the /i,
  /^these are /i,
  /^those with /i,
  /^want to avoid /i,
  /^that may worsen /i,
  /^nightshade vegetables include/i,
  /^- /,
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildFoodItem(column, value) {
  return {
    id: `${column.list}-${column.groupId}-${slugify(value)}`,
    name: value,
    defaultPortion: {
      amount: 1,
      unit: "serving",
    },
    packageSize: null,
    source: {
      list: "sleekgeek-food-list",
      url: "https://www.sleekgeek.co.za/foodlist-google-sheets/",
    },
  };
}

function splitSectionAtItemTitle(section, markerTitle) {
  const markerIndex = section.items.findIndex(
    (item) => item.name.toLowerCase() === markerTitle.toLowerCase(),
  );

  if (markerIndex < 0) {
    return [section];
  }

  const beforeItems = section.items.slice(0, markerIndex);
  const afterItems = section.items.slice(markerIndex + 1);
  const parts = [];

  if (beforeItems.length > 0) {
    parts.push({
      title: section.title,
      items: beforeItems,
    });
  }

  parts.push({
    title: markerTitle,
    items: afterItems,
  });

  return parts;
}

function mergeSectionsByTitle(sections) {
  const mergedByTitle = new Map();

  for (const section of sections) {
    if (!mergedByTitle.has(section.title)) {
      mergedByTitle.set(section.title, {
        title: section.title,
        items: [],
      });
    }

    const target = mergedByTitle.get(section.title);
    for (const item of section.items) {
      if (!target.items.some((existing) => existing.id === item.id)) {
        target.items.push(item);
      }
    }
  }

  return [...mergedByTitle.values()];
}

function shouldSkip(value) {
  if (!value) return true;
  return skipPatterns.some((pattern) => pattern.test(value));
}

function getStrictSectionTitles(column) {
  const key = `${column.list}/${column.groupId}`;
  const strictMap = {
    "orange/protein": [
      "Meat",
      "Poultry",
      "Fish (Medium Mercury)",
      "Dairy",
      "Other",
    ],
    "orange/vegetables": ["Starchy Veg"],
    "orange/carbs": ["Grains", "Dairy", "Other"],
    "orange/fats": ["Oils", "Nuts and Seeds", "Dairy", "Other"],
  };

  const titles = strictMap[key];
  return titles ? new Set(titles.map((title) => title.toLowerCase())) : null;
}

function isPotentialSectionLabel(value) {
  if (value.length > 40) return false;
  if (/\d/.test(value)) return false;
  if (/[,:]/.test(value)) return false;

  const words = value.split(/\s+/);
  if (words.length > 5) return false;

  const commonSectionWords = [
    "meat",
    "eggs",
    "fish",
    "seafood",
    "shellfish",
    "dairy",
    "plant-based",
    "other",
    "vegetables",
    "grains",
    "legumes",
    "fruit",
    "oils",
    "drinks",
    "protein",
    "carbs",
    "fats",
  ];

  const lowered = value.toLowerCase();
  return commonSectionWords.some((word) => lowered.includes(word));
}

function postProcessSections(column, sections) {
  let nextSections = sections.map((section) => ({
    title: section.title,
    items: [...section.items],
  }));

  if (column.list === "green" && column.groupId === "colourful-vegetables") {
    const rebuiltSections = [];
    for (const section of nextSections) {
      rebuiltSections.push(
        ...splitSectionAtItemTitle(section, "White / Tan / Brown Vegetables"),
      );
    }
    nextSections = rebuiltSections;
  }

  if (column.list === "green" && column.groupId === "smart-carbs") {
    const fruitSectionTitle = "Fruit (fresh, not dried or canned)";

    for (const section of nextSections) {
      const lowered = section.title.toLowerCase();
      if (lowered === "grapefruit" || lowered === "kiwifruit") {
        section.title = fruitSectionTitle;
        const headingAsFood = buildFoodItem(
          column,
          lowered === "grapefruit" ? "Grapefruit" : "Kiwifruit",
        );
        if (!section.items.some((item) => item.id === headingAsFood.id)) {
          section.items.unshift(headingAsFood);
        }
      }
    }

    const rebuiltSections = [];
    for (const section of nextSections) {
      rebuiltSections.push(
        ...splitSectionAtItemTitle(section, fruitSectionTitle),
      );
    }
    nextSections = mergeSectionsByTitle(rebuiltSections);
  }

  if (column.list === "green" && column.groupId === "quality-protein") {
    for (const section of nextSections) {
      if (section.title.toLowerCase() === "lobster and crayfish") {
        section.title = "Seafood and Shellfish";
      }
    }
    nextSections = mergeSectionsByTitle(nextSections);
  }

  if (column.list === "green" && column.groupId === "healthy-fats") {
    for (const section of nextSections) {
      if (section.title.toLowerCase() === "fish oil") {
        section.title = "Oils (cold-pressed)";
        const fishOilItem = buildFoodItem(column, "Fish Oil");
        if (!section.items.some((item) => item.id === fishOilItem.id)) {
          section.items.unshift(fishOilItem);
        }
      }
    }

    let rebuiltSections = [];
    for (const section of nextSections) {
      const splitOnNuts = splitSectionAtItemTitle(
        section,
        "Nuts (raw, unflavoured, unsalted)",
      );

      for (const splitSection of splitOnNuts) {
        rebuiltSections.push(
          ...splitSectionAtItemTitle(
            splitSection,
            "Seeds (raw, unflavoured, unsalted)",
          ),
        );
      }
    }

    nextSections = mergeSectionsByTitle(rebuiltSections);
  }

  return nextSections.filter((section) => section.items.length > 0);
}

function cloneStarchyVegFromGreenSmartCarbs(sourceSections, targetColumn) {
  const starchySection = sourceSections.find(
    (section) => section.title.toLowerCase() === "starchy veg",
  );

  if (!starchySection) {
    return null;
  }

  return [
    {
      title: "Starchy Veg",
      items: starchySection.items.map((item) =>
        buildFoodItem(targetColumn, item.name),
      ),
    },
  ];
}

async function main() {
  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch source sheet: ${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);

  const files = [];
  const generatedSectionsByKey = new Map();

  for (const column of columnMap) {
    const sections = [];
    let currentSection = rows[4]?.[column.index]?.trim() || "General";
    let sectionItems = [];
    const strictSectionTitles = getStrictSectionTitles(column);

    for (let rowIndex = 5; rowIndex < rows.length; rowIndex += 1) {
      const raw = rows[rowIndex]?.[column.index] ?? "";
      const value = raw.trim();

      if (shouldSkip(value)) {
        continue;
      }

      const isEggItemInPoultryAndEggs =
        column.list === "green" &&
        column.groupId === "quality-protein" &&
        currentSection.toLowerCase() === "poultry & eggs" &&
        value.toLowerCase() === "eggs";

      const isStrictSection =
        strictSectionTitles?.has(value.toLowerCase()) ?? false;
      const isHeuristicSection =
        !strictSectionTitles && isPotentialSectionLabel(value);

      if (
        !isEggItemInPoultryAndEggs &&
        (isStrictSection || isHeuristicSection)
      ) {
        if (sectionItems.length > 0) {
          sections.push({ title: currentSection, items: sectionItems });
          sectionItems = [];
        }
        currentSection = value;
        continue;
      }

      sectionItems.push(buildFoodItem(column, value));
    }

    if (sectionItems.length > 0) {
      sections.push({ title: currentSection, items: sectionItems });
    }

    let cleanedSections = postProcessSections(column, sections);

    if (column.list === "orange" && column.groupId === "vegetables") {
      const sourceSections = generatedSectionsByKey.get("green/smart-carbs");
      if (sourceSections) {
        const cloned = cloneStarchyVegFromGreenSmartCarbs(
          sourceSections,
          column,
        );
        if (cloned) {
          cleanedSections = cloned;
        }
      }
    }

    generatedSectionsByKey.set(
      `${column.list}/${column.groupId}`,
      cleanedSections,
    );
    const fileName = `${column.list}-${column.groupId}.json`;

    files.push({
      file: fileName,
      list: column.list,
      groupId: column.groupId,
      groupLabel: column.groupLabel,
      itemCount: cleanedSections.reduce(
        (total, section) => total + section.items.length,
        0,
      ),
    });

    await writeFile(
      path.join(OUTPUT_DIR, fileName),
      JSON.stringify(
        {
          list: column.list,
          groupId: column.groupId,
          groupLabel: column.groupLabel,
          sections: cleanedSections,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
  }

  await writeFile(
    path.join(OUTPUT_DIR, "index.json"),
    JSON.stringify(
      {
        source: "https://www.sleekgeek.co.za/foodlist-google-sheets/",
        generatedAt: new Date().toISOString(),
        files,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await mkdir(path.resolve(process.cwd(), "public/data/templates"), {
    recursive: true,
  });

  await writeFile(
    path.resolve(process.cwd(), "public/data/templates/default.json"),
    JSON.stringify(
      [
        {
          id: "balanced-plate",
          name: "Balanced Plate",
          groupTargets: [
            "quality-protein",
            "colourful-vegetables",
            "smart-carbs",
            "healthy-fats",
          ],
        },
        {
          id: "lower-carb",
          name: "Lower-Carb Plate",
          groupTargets: [
            "quality-protein",
            "colourful-vegetables",
            "healthy-fats",
          ],
        },
      ],
      null,
      2,
    ) + "\n",
    "utf8",
  );

  const total = files.reduce((sum, file) => sum + file.itemCount, 0);
  console.log(`Generated ${files.length} files with ${total} foods`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

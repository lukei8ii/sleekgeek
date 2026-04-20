import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const foodsDir = path.resolve(process.cwd(), "public/data/foods");
const indexPath = path.join(foodsDir, "index.json");
const keepListPath = path.join(foodsDir, "enrichment/food-keep-list.txt");

function parseKeepIds(text) {
  const ids = new Set();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [id] = line.split(/\t|\s+\|\s+/);
    if (id) ids.add(id.trim());
  }
  return ids;
}

async function filterOverlay(filePath, keepIds) {
  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw);

    const packageOverrides = (data.packageOverrides ?? []).filter((entry) =>
      keepIds.has(entry.foodId),
    );
    const portionOverrides = (data.portionOverrides ?? []).filter((entry) =>
      keepIds.has(entry.foodId),
    );

    await writeFile(
      filePath,
      JSON.stringify({ packageOverrides, portionOverrides }, null, 2) + "\n",
      "utf8",
    );
  } catch {
    // Overlay file may not exist yet in some workflows.
  }
}

async function main() {
  const keepListRaw = await readFile(keepListPath, "utf8");
  const keepIds = parseKeepIds(keepListRaw);

  if (keepIds.size === 0) {
    throw new Error("Keep-list has no food IDs. Aborting.");
  }

  const index = JSON.parse(await readFile(indexPath, "utf8"));

  for (const meta of index.files ?? []) {
    const filePath = path.join(foodsDir, meta.file);
    const data = JSON.parse(await readFile(filePath, "utf8"));

    const sections = (data.sections ?? [])
      .map((section) => ({
        ...section,
        items: (section.items ?? []).filter((item) => keepIds.has(item.id)),
      }))
      .filter((section) => section.items.length > 0);

    const nextFile = {
      ...data,
      sections,
    };

    meta.itemCount = sections.reduce(
      (total, section) => total + section.items.length,
      0,
    );

    await writeFile(filePath, JSON.stringify(nextFile, null, 2) + "\n", "utf8");
  }

  const nextIndex = {
    ...index,
    generatedAt: new Date().toISOString(),
  };

  await writeFile(indexPath, JSON.stringify(nextIndex, null, 2) + "\n", "utf8");

  await filterOverlay(path.join(foodsDir, "overrides.json"), keepIds);
  await filterOverlay(
    path.join(foodsDir, "enrichment/approved-overrides.json"),
    keepIds,
  );

  console.log(`Applied keep-list with ${keepIds.size} IDs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

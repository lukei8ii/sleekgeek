import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const foodsDir = path.resolve(process.cwd(), "public/data/foods");
const indexPath = path.join(foodsDir, "index.json");
const standardsPath = path.join(
  foodsDir,
  "enrichment/public-size-standards.json",
);
const approvedPath = path.join(foodsDir, "enrichment/approved-overrides.json");

function matchesRule(food, rule, defaultApplyToLists = []) {
  const effectiveLists =
    rule.applyToLists?.length > 0 ? rule.applyToLists : defaultApplyToLists;

  if (effectiveLists.length && !effectiveLists.includes(food.list)) {
    return false;
  }

  if (
    rule.applyToGroupIds?.length &&
    !rule.applyToGroupIds.some((groupId) => food.groupId.includes(groupId))
  ) {
    return false;
  }

  const hay = `${food.id} ${food.name}`.toLowerCase();
  if (rule.excludeAny?.some((token) => hay.includes(token.toLowerCase()))) {
    return false;
  }

  return rule.matchAny.some((token) => hay.includes(token.toLowerCase()));
}

async function loadFoods() {
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const foods = [];

  for (const fileMeta of index.files) {
    const filePath = path.join(foodsDir, fileMeta.file);
    const foodFile = JSON.parse(await readFile(filePath, "utf8"));

    for (const section of foodFile.sections) {
      for (const item of section.items) {
        foods.push({
          id: item.id,
          name: item.name,
          list: fileMeta.list,
          groupId: fileMeta.groupId,
          groupLabel: fileMeta.groupLabel,
        });
      }
    }
  }

  return foods;
}

async function main() {
  const foods = await loadFoods();
  const standards = JSON.parse(await readFile(standardsPath, "utf8"));
  const defaultApplyToLists = standards.defaultApplyToLists ?? [];

  const sourceById = new Map(
    (standards.sources ?? []).map((entry) => [entry.id, entry]),
  );

  const packageByFoodId = new Map();
  const portionByFoodId = new Map();

  for (const food of foods) {
    const rule = (standards.rules ?? []).find((candidate) =>
      matchesRule(food, candidate, defaultApplyToLists),
    );
    if (!rule) continue;

    if (rule.packageSize) {
      packageByFoodId.set(food.id, {
        foodId: food.id,
        packageSize: rule.packageSize,
        packageSource: rule.packageSource,
        references: (rule.references ?? [])
          .map((id) => sourceById.get(id))
          .filter(Boolean)
          .map((source) => ({
            provider: "public-web",
            id: source.id,
            label: source.label,
            url: source.url,
          })),
      });
    }

    if (rule.defaultPortion) {
      portionByFoodId.set(food.id, {
        foodId: food.id,
        defaultPortion: rule.defaultPortion,
      });
    }
  }

  const packageOverrides = Array.from(packageByFoodId.values());
  const portionOverrides = Array.from(portionByFoodId.values());

  const output = {
    packageOverrides,
    portionOverrides,
  };

  await writeFile(approvedPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(
    `Wrote ${packageOverrides.length} package overrides and ${portionOverrides.length} portion overrides`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

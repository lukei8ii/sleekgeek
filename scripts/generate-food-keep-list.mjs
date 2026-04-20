import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const foodsDir = path.resolve(process.cwd(), "public/data/foods");
const indexPath = path.join(foodsDir, "index.json");
const outputDir = path.join(foodsDir, "enrichment");
const outputPath = path.join(outputDir, "food-keep-list.txt");

async function main() {
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const lines = [
    "# Sleekgeek Food Keep List",
    "# Keep lines for foods you want. Delete lines for foods you do not buy.",
    "# Format: foodId<TAB>foodName",
    "",
  ];

  for (const meta of index.files ?? []) {
    const filePath = path.join(foodsDir, meta.file);
    const data = JSON.parse(await readFile(filePath, "utf8"));
    const sections = (data.sections ?? []).filter(
      (section) => (section.items ?? []).length > 0,
    );

    if (sections.length === 0) {
      continue;
    }

    lines.push(`# ${meta.list.toUpperCase()} - ${meta.groupLabel}`);

    for (const section of sections) {
      lines.push(`# Section: ${section.title}`);
      for (const item of section.items ?? []) {
        lines.push(`${item.id}\t${item.name}`);
      }
      lines.push("");
    }
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote keep-list template to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

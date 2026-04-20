import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const foodsDir = path.resolve(process.cwd(), "public/data/foods");
const indexPath = path.join(foodsDir, "index.json");
const outputPath = path.join(foodsDir, "overlay-template.json");

async function main() {
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const packageOverrides = [];

  for (const fileMeta of index.files) {
    const filePath = path.join(foodsDir, fileMeta.file);
    const foodFile = JSON.parse(await readFile(filePath, "utf8"));

    for (const section of foodFile.sections) {
      for (const item of section.items) {
        packageOverrides.push({
          foodId: item.id,
          packageSize: null,
          packageSource: "",
          references: [],
          note: `${item.name} (${fileMeta.groupLabel})`,
        });
      }
    }
  }

  const template = {
    packageOverrides,
    portionOverrides: [],
  };

  await writeFile(outputPath, JSON.stringify(template, null, 2) + "\n", "utf8");
  console.log(`Wrote ${packageOverrides.length} overlay rows to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

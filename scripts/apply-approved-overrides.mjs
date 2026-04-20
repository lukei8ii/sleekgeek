import { copyFile } from "node:fs/promises";
import path from "node:path";

const approvedPath = path.resolve(
  process.cwd(),
  "public/data/foods/enrichment/approved-overrides.json",
);
const runtimePath = path.resolve(
  process.cwd(),
  "public/data/foods/overrides.json",
);

async function main() {
  await copyFile(approvedPath, runtimePath);
  console.log("Copied approved overrides into runtime overlay file");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

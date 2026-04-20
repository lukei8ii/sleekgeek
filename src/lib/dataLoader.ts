import type {
  CanonicalGroup,
  FoodEntry,
  FoodIndexFile,
  FoodOverlayFile,
  FoodSectionFile,
  GroupToken,
  MealTemplate,
  PortionProfile,
} from "../types/models";

function toCanonicalGroup(groupToken: GroupToken): CanonicalGroup {
  const normalized = groupToken.toLowerCase();

  if (normalized.includes("protein")) return "protein";
  if (normalized.includes("vegetable")) return "vegetables";
  if (
    normalized.includes("carb") ||
    normalized.includes("grain") ||
    normalized.includes("starch")
  )
    return "carbs";
  return "fats";
}

export async function loadOfficialData(): Promise<{
  foods: FoodEntry[];
  templates: MealTemplate[];
  portionProfile: PortionProfile | null;
}> {
  const indexResponse = await fetch("/data/foods/index.json");
  if (!indexResponse.ok) {
    throw new Error("Failed to load food index");
  }

  const index = (await indexResponse.json()) as FoodIndexFile;

  const filePromises = index.files.map(async (fileMeta) => {
    const response = await fetch(`/data/foods/${fileMeta.file}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${fileMeta.file}`);
    }
    return (await response.json()) as FoodSectionFile;
  });

  const sectionFiles = await Promise.all(filePromises);
  let overlays: FoodOverlayFile = {
    packageOverrides: [],
    portionOverrides: [],
  };

  // Overlay file is optional; this keeps the official source JSON immutable.
  const overlayResponse = await fetch("/data/foods/overrides.json");
  if (overlayResponse.ok) {
    overlays = (await overlayResponse.json()) as FoodOverlayFile;
  }

  const packageByFoodId = new Map(
    overlays.packageOverrides.map((override) => [override.foodId, override]),
  );
  const portionByFoodId = new Map(
    (overlays.portionOverrides ?? []).map((override) => [
      override.foodId,
      override,
    ]),
  );

  const foods: FoodEntry[] = [];

  for (const file of sectionFiles) {
    for (const section of file.sections) {
      for (const item of section.items) {
        const packageOverride = packageByFoodId.get(item.id);
        const portionOverride = portionByFoodId.get(item.id);

        foods.push({
          ...item,
          packageSize: packageOverride?.packageSize ?? item.packageSize,
          defaultPortion:
            portionOverride?.defaultPortion ?? item.defaultPortion,
          list: file.list,
          groupId: file.groupId,
          groupLabel: file.groupLabel,
          canonicalGroup: toCanonicalGroup(file.groupId),
          sectionTitle: section.title,
          isCustom: false,
          enrichment: packageOverride
            ? {
                packageSource: packageOverride.packageSource,
                references: packageOverride.references,
              }
            : undefined,
        });
      }
    }
  }

  const templatesResponse = await fetch("/data/templates/default.json");
  if (!templatesResponse.ok) {
    throw new Error("Failed to load default templates");
  }

  const templateData = (await templatesResponse.json()) as MealTemplate[];
  const templates = templateData.map((template) => ({
    ...template,
    groupTargets: (template.groupTargets ?? []).map((token) =>
      toCanonicalGroup(token),
    ),
    fixedPicks: template.fixedPicks?.map((pick) => ({
      ...pick,
      group: pick.group ? toCanonicalGroup(pick.group) : undefined,
    })),
  }));

  let portionProfile: PortionProfile | null = null;
  const portionProfileResponse = await fetch(
    "/data/config/portion-profile.json",
  );
  if (portionProfileResponse.ok) {
    portionProfile = (await portionProfileResponse.json()) as PortionProfile;
  }

  return { foods, templates, portionProfile };
}

export function normalizeTemplateTargets(
  groupTargets: GroupToken[],
): CanonicalGroup[] {
  return groupTargets.map((token) => toCanonicalGroup(token));
}

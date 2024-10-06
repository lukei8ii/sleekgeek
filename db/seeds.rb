# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

[ "More", "Some", "Less" ].each do |name|
     Frequency.find_or_create_by!(name: name)
end

[ "Protein", "Vegetable", "Carbohydrate", "Fat" ].each do |name|
  Kind.find_or_create_by!(name: name)
end

[
  "Meat",
  "Poultry & Eggs",
  "Fish",
  "Seafood and Shellfish",
  "Dairy",
  "Plant-Based",
  "Red Vegetables",
  "Yellow / Orange Vegetables",
  "White / Tan / Brown Vegetables",
  "Purple Vegetables",
  "Green Vegetables",
  "Starchy Veg",
  "Whole Grains",
  "Legumes",
  "Fruit (fresh, not dried or canned)",
  "Oils (cold-pressed)",
  "Nuts (raw, unflavoured, unsalted)",
  "Seeds (raw, unflavoured, unsalted)",
  "Other",
  "Poultry",
  "Fish (Medium Mercury)",
  "Grains",
  "Oils",
  "Nuts and Seeds",
  "Fish (High-Mercury)",
  "Sugar and Sweeteners",
  "Drinks"
].each do |name|
  Category.find_or_create_by!(name: name)
end

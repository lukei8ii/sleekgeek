# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2024_10_05_213722) do
  create_table "categories", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "foods", force: :cascade do |t|
    t.string "name"
    t.integer "package_portions"
    t.integer "category_id", null: false
    t.integer "kind_id", null: false
    t.integer "frequency_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category_id"], name: "index_foods_on_category_id"
    t.index ["frequency_id"], name: "index_foods_on_frequency_id"
    t.index ["kind_id"], name: "index_foods_on_kind_id"
  end

  create_table "frequencies", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "ingredients", force: :cascade do |t|
    t.integer "recipe_id", null: false
    t.integer "food_id", null: false
    t.integer "portions"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["food_id"], name: "index_ingredients_on_food_id"
    t.index ["recipe_id"], name: "index_ingredients_on_recipe_id"
  end

  create_table "kinds", force: :cascade do |t|
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "meal_plan_recipes", force: :cascade do |t|
    t.integer "meal_plan_id", null: false
    t.integer "recipe_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["meal_plan_id"], name: "index_meal_plan_recipes_on_meal_plan_id"
    t.index ["recipe_id"], name: "index_meal_plan_recipes_on_recipe_id"
  end

  create_table "meal_plans", force: :cascade do |t|
    t.integer "meals"
    t.integer "rating"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "recipes", force: :cascade do |t|
    t.string "name"
    t.string "image"
    t.integer "servings"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.text "preferences"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "foods", "categories"
  add_foreign_key "foods", "frequencies"
  add_foreign_key "foods", "kinds"
  add_foreign_key "ingredients", "foods"
  add_foreign_key "ingredients", "recipes"
  add_foreign_key "meal_plan_recipes", "meal_plans"
  add_foreign_key "meal_plan_recipes", "recipes"
end

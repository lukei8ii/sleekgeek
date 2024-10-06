class CreateMealPlanRecipes < ActiveRecord::Migration[7.2]
  def change
    create_table :meal_plan_recipes do |t|
      t.references :meal_plan, null: false, foreign_key: true
      t.references :recipe, null: false, foreign_key: true

      t.timestamps
    end
  end
end

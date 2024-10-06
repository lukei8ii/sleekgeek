class CreateMealPlans < ActiveRecord::Migration[7.2]
  def change
    create_table :meal_plans do |t|
      t.integer :meals
      t.integer :rating

      t.timestamps
    end
  end
end

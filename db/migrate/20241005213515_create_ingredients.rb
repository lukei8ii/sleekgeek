class CreateIngredients < ActiveRecord::Migration[7.2]
  def change
    create_table :ingredients do |t|
      t.references :recipe, null: false, foreign_key: true
      t.references :food, null: false, foreign_key: true
      t.integer :portions

      t.timestamps
    end
  end
end

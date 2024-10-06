class CreateRecipes < ActiveRecord::Migration[7.2]
  def change
    create_table :recipes do |t|
      t.string :name
      t.string :image
      t.integer :servings
      t.text :description

      t.timestamps
    end
  end
end

class CreateFoods < ActiveRecord::Migration[7.2]
  def change
    create_table :foods do |t|
      t.string :name
      t.integer :package_portions
      t.references :category, null: false, foreign_key: true
      t.references :kind, null: false, foreign_key: true
      t.references :frequency, null: false, foreign_key: true

      t.timestamps
    end
  end
end

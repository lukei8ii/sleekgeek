class CreateKinds < ActiveRecord::Migration[7.2]
  def change
    create_table :kinds do |t|
      t.string :name

      t.timestamps
    end
  end
end

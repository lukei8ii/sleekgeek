class CreateFrequencies < ActiveRecord::Migration[7.2]
  def change
    create_table :frequencies do |t|
      t.string :name

      t.timestamps
    end
  end
end

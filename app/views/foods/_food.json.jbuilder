json.extract! food, :id, :name, :package_portions, :category_id, :kind_id, :frequency_id, :created_at, :updated_at
json.url food_url(food, format: :json)

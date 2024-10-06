class Recipe < ApplicationRecord
  has_many :ingredients, inverse_of: :recipe
  has_many :foods, through: :ingredients

  accepts_nested_attributes_for :ingredients, reject_if: :all_blank, allow_destroy: true
end

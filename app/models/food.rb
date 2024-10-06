class Food < ApplicationRecord
  belongs_to :category
  belongs_to :kind
  belongs_to :frequency

  has_many :recipes, through: :ingredients
end

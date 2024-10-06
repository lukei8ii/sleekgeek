class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  typed_store :preferences, coder: JSON do |p|
    p.integer :servings_per_meal, default: 1
  end
end

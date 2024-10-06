class ProfilesController < ApplicationController
  before_action :set_user, only: %i[ show update ]

  # GET /profile
  def show
  end

  # PATCH/PUT /profile
  def update
    respond_to do |format|
      if @user.update(user_params)
        format.html { redirect_to profile_path, notice: "Profile was successfully updated." }
      else
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_user
      @user = current_user
    end

    # Only allow a list of trusted parameters through.
    def user_params
      params.require(:user).permit(:servings_per_meal)
    end
end

import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values  = { navState: Boolean, profileState: Boolean }
  static targets = [ "nav", "x", "bars", "profile" ]

  connect() {
    console.log(this.navStateValue, this.profileStateValue)
  }

  toggleNav() {
    this.navStateValue = !this.navStateValue

    if (this.navStateValue) {
      this.openNav()
      this.showX()
    } else {
      this.closeNav()
      this.showBars()
    }
  }

  openNav() {
    this.navTarget.classList.remove("hidden");
  }

  closeNav() {
    this.navTarget.classList.add("hidden");
  }

  showBars() {
    this.xTarget.classList.add("hidden")
    this.barsTarget.classList.remove("hidden")
  }

  showX() {
    this.xTarget.classList.remove("hidden")
    this.barsTarget.classList.add("hidden")
  }

  toggleProfile() {
    this.profileStateValue = !this.profileStateValue

    if (this.profileStateValue) {
      this.openProfile()
    } else {
      this.closeProfile()
    }
  }

  openProfile() {
    this.profileTarget.classList.remove("hidden");
  }

  closeProfile() {
    this.profileTarget.classList.add("hidden");
  }
}
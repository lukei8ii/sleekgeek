module NavbarHelper
  def create_desktop_nav_link(text, path)
    class_name = current_page?(path) ? "rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white" : "rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"

    link_to text, path, class: class_name
  end

  def create_mobile_nav_link(text, path)
    class_name = current_page?(path) ? "block rounded-md bg-gray-900 px-3 py-2 text-base font-medium text-white" : "block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"

    link_to text, path, class: class_name
  end
end

// src/components/menu/MenuRegistry.js
// Système de registre pour gérer dynamiquement les éléments de menu

class MenuRegistry {
  constructor() {
    this.topMenuItems = [];
    this.sidebarItems = [];
    this.listeners = new Set();

    // Chargement de l'état des menus depuis localStorage
    this.expandedItems = new Set();
    this.loadMenuState();
  }

  loadMenuState() {
    try {
      const savedState = JSON.parse(localStorage.getItem('menuState'));
      this.expandedItems = new Set(savedState?.expandedItems || []);
    } catch (error) {
      console.error("Erreur lors du chargement de l'état du menu:", error);
    }
  }

  saveMenuState() {
    try {
      localStorage.setItem(
        'menuState',
        JSON.stringify({ expandedItems: Array.from(this.expandedItems) })
      );
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'état du menu:", error);
    }
  }

  isExpanded(itemId) {
    return this.expandedItems.has(itemId);
  }

  toggleExpanded(itemId) {
    this.isExpanded(itemId) ? this.expandedItems.delete(itemId) : this.expandedItems.add(itemId);
    this.saveMenuState();
    this.notifyListeners();
  }

  expandItemForPath(path) {
    let shouldNotify = false;

    this.sidebarItems.forEach((item) => {
      if (item.children?.some((child) => path.startsWith(child.path + '/'))) {
        if (!this.isExpanded(item.id)) {
          this.expandedItems.add(item.id);
          shouldNotify = true;
        }
      }
    });

    if (shouldNotify) {
      this.saveMenuState();
      this.notifyListeners();
    }
  }

  addMenuItem(collection, item) {
    if (collection.some((i) => i.id === item.id)) {
      console.warn(`Un élément de menu avec l'ID ${item.id} existe déjà`);
      return false;
    }

    if (item.parentId) {
      const parent = collection.find((i) => i.id === item.parentId);
      if (!parent) {
        console.warn(`Parent avec ID ${item.parentId} non trouvé`);
        return false;
      }
      parent.children = parent.children || [];
      parent.children.push(item);
    } else {
      collection.push(item);
    }

    this.notifyListeners();
    return true;
  }

  addTopMenuItem(item) {
    return this.addMenuItem(this.topMenuItems, item);
  }

  addSidebarItem(item) {
    return this.addMenuItem(this.sidebarItems, item);
  }

  removeMenuItem(collection, id) {
    const initialLength = collection.length;
    const filtered = collection.filter((item) => item.id !== id);

    if (filtered.length !== initialLength) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  removeTopMenuItem(id) {
    return this.removeMenuItem(this.topMenuItems, id);
  }

  removeSidebarItem(id) {
    return this.removeMenuItem(this.sidebarItems, id);
  }

  updateMenuItem(collection, id, updates) {
    const item = collection.find((item) => item.id === id);
    if (!item) return false;

    Object.assign(item, updates);
    this.notifyListeners();
    return true;
  }

  updateTopMenuItem(id, updates) {
    return this.updateMenuItem(this.topMenuItems, id, updates);
  }

  updateSidebarItem(id, updates) {
    return this.updateMenuItem(this.sidebarItems, id, updates);
  }

  sortMenuItems(collection, sortFn) {
    collection.sort(sortFn);
    this.notifyListeners();
  }

  sortTopMenuItems(sortFn) {
    this.sortMenuItems(this.topMenuItems, sortFn);
  }

  sortSidebarItems(sortFn) {
    this.sortMenuItems(this.sidebarItems, sortFn);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) =>
      listener({
        topMenuItems: [...this.topMenuItems],
        sidebarItems: [...this.sidebarItems],
      })
    );
  }

  getTopMenuItems() {
    return [...this.topMenuItems];
  }

  getSidebarItems() {
    return [...this.sidebarItems];
  }
}

// Exporter une instance unique pour l'application
export const menuRegistry = new MenuRegistry();

// src/components/menu/MenuRegistry.js
// Système de registre pour gérer dynamiquement les éléments de menu

class MenuRegistry {
  constructor() {
    this.topMenuItems = [];
    this.sidebarItems = [];
    this.listeners = [];

    // Chargement de l'état des menus depuis localStorage
    this.loadMenuState();
  }
  loadMenuState() {
    try {
      const savedState = localStorage.getItem('menuState');
      if (savedState) {
        const { expandedItems } = JSON.parse(savedState);
        this.expandedItems = expandedItems || [];
      } else {
        this.expandedItems = [];
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'état du menu:", error);
      this.expandedItems = [];
    }
  }

  saveMenuState() {
    try {
      const menuState = {
        expandedItems: this.expandedItems,
      };
      localStorage.setItem('menuState', JSON.stringify(menuState));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'état du menu:", error);
    }
  }

  isExpanded(itemId) {
    return this.expandedItems.includes(itemId);
  }

  toggleExpanded(itemId) {
    if (this.isExpanded(itemId)) {
      this.expandedItems = this.expandedItems.filter((id) => id !== itemId);
    } else {
      this.expandedItems = [...this.expandedItems, itemId];
    }
    this.saveMenuState();
    this.notifyListeners();
  }

  expandItemForPath(path) {
    let found = false;

    // Parcourir tous les éléments du menu pour trouver celui qui correspond au chemin
    this.sidebarItems.forEach((item) => {
      if (item.children) {
        const matchingChild = item.children.find(
          (child) => path === child.path || (path !== '/' && path.startsWith(child.path + '/'))
        );

        // Si un enfant correspond, développer le parent
        if (matchingChild && !this.isExpanded(item.id)) {
          this.expandedItems = [...this.expandedItems, item.id];
          found = true;
        }
      }
    });

    if (found) {
      this.saveMenuState();
      this.notifyListeners();
    }
  }

  // Ajouter un élément au menu supérieur
  addTopMenuItem(item) {
    // Vérifier que l'élément a un ID unique
    if (this.topMenuItems.some((i) => i.id === item.id)) {
      console.warn(`Un élément de menu avec l'ID ${item.id} existe déjà dans le menu supérieur`);
      return false;
    }

    this.topMenuItems.push(item);
    this.notifyListeners();
    return true;
  }

  // Ajouter un élément au menu latéral
  addSidebarItem(item) {
    // Vérifier que l'élément a un ID unique
    if (this.sidebarItems.some((i) => i.id === item.id)) {
      console.warn(`Un élément de menu avec l'ID ${item.id} existe déjà dans le menu latéral`);
      return false;
    }

    // Si l'élément a un parent, l'ajouter comme enfant
    if (item.parentId) {
      const parentIndex = this.sidebarItems.findIndex((i) => i.id === item.parentId);
      if (parentIndex !== -1) {
        if (!this.sidebarItems[parentIndex].children) {
          this.sidebarItems[parentIndex].children = [];
        }
        this.sidebarItems[parentIndex].children.push(item);
        this.notifyListeners();
        return true;
      }
      console.warn(`Parent avec ID ${item.parentId} non trouvé`);
      return false;
    }

    this.sidebarItems.push(item);
    this.notifyListeners();
    return true;
  }

  // Supprimer un élément du menu supérieur
  removeTopMenuItem(id) {
    const initialLength = this.topMenuItems.length;
    this.topMenuItems = this.topMenuItems.filter((item) => item.id !== id);

    if (this.topMenuItems.length !== initialLength) {
      this.notifyListeners();
      return true;
    }

    return false;
  }

  // Supprimer un élément du menu latéral
  removeSidebarItem(id) {
    const initialLength = this.sidebarItems.length;
    this.sidebarItems = this.sidebarItems.filter((item) => item.id !== id);

    if (this.sidebarItems.length !== initialLength) {
      this.notifyListeners();
      return true;
    }

    return false;
  }

  // Mettre à jour un élément existant dans le menu supérieur
  updateTopMenuItem(id, updates) {
    const itemIndex = this.topMenuItems.findIndex((item) => item.id === id);

    if (itemIndex !== -1) {
      this.topMenuItems[itemIndex] = { ...this.topMenuItems[itemIndex], ...updates };
      this.notifyListeners();
      return true;
    }

    return false;
  }

  // Mettre à jour un élément existant dans le menu latéral
  updateSidebarItem(id, updates) {
    const itemIndex = this.sidebarItems.findIndex((item) => item.id === id);

    if (itemIndex !== -1) {
      this.sidebarItems[itemIndex] = { ...this.sidebarItems[itemIndex], ...updates };
      this.notifyListeners();
      return true;
    }

    return false;
  }

  // Trier les éléments de menu selon l'ordre spécifié
  sortTopMenuItems(sortFn) {
    this.topMenuItems.sort(sortFn);
    this.notifyListeners();
  }

  sortSidebarItems(sortFn) {
    this.sidebarItems.sort(sortFn);
    this.notifyListeners();
  }

  // S'abonner aux changements
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notifier les abonnés des changements
  notifyListeners() {
    this.listeners.forEach((listener) =>
      listener({
        topMenuItems: this.topMenuItems,
        sidebarItems: this.sidebarItems,
      })
    );
  }

  // Obtenir les éléments actuels
  getTopMenuItems() {
    return [...this.topMenuItems];
  }

  getSidebarItems() {
    return [...this.sidebarItems];
  }
}

// Exporter une instance unique pour l'application
export const menuRegistry = new MenuRegistry();

// src/components/menu/initializeMenus.js
import React from 'react';
import { menuRegistry } from './MenuRegistry';
import { Home, Package, ShoppingCart, BarChart2, Settings } from 'lucide-react';

export function initializeMenus() {
  // Ajouter des éléments au menu latéral
  menuRegistry.addSidebarItem({
    id: 'dashboard',
    icon: <Home className="h-6 w-6" />,
    label: 'Tableau de bord',
    path: '/',
    active: true,
  });

  menuRegistry.addSidebarItem({
    id: 'products',
    icon: <Package className="h-6 w-6" />,
    label: 'Produits',
    path: '/products',
  });

  menuRegistry.addSidebarItem({
    id: 'sales',
    icon: <ShoppingCart className="h-6 w-6" />,
    label: 'Ventes',
    path: '/sales',
  });

  menuRegistry.addSidebarItem({
    id: 'reports',
    icon: <BarChart2 className="h-6 w-6" />,
    label: 'Rapports',
    path: '/reports',
  });

  menuRegistry.addSidebarItem({
    id: 'settings',
    icon: <Settings className="h-6 w-6" />,
    label: 'Paramètres',
    path: '/settings',
  });
}

export function updateActiveMenuItem() {
  const currentPath = window.location.pathname;

  menuRegistry.getSidebarItems().forEach((item) => {
    menuRegistry.updateSidebarItem(item.id, {
      active: item.path === currentPath,
    });
  });
}

// Ajouter un écouteur pour mettre à jour lors des changements de route
window.addEventListener('popstate', updateActiveMenuItem);

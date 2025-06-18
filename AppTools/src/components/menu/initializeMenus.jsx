// src/components/menu/initializeMenus.js
import React from 'react';
import { menuRegistry } from './MenuRegistry';
import {
  Home,
  Package,
  ShoppingCart,
  BarChart2,
  Settings,
  Folder,
  Truck,
  Tag,
  Monitor,
  Printer,
  Cog,
} from 'lucide-react';

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
    id: 'cashier',
    icon: <ShoppingCart className="h-6 w-6" />,
    label: 'Caisse',
    path: '/caisse',
  });

  menuRegistry.addSidebarItem({
    id: 'products',
    icon: <Package className="h-6 w-6" />,
    label: 'Produits',
    path: '/products',
    children: [
      {
        id: 'categories',
        icon: <Folder className="h-5 w-5" />,
        label: 'Catégories',
        path: '/products/categories',
      },
      {
        id: 'suppliers',
        icon: <Truck className="h-5 w-5" />,
        label: 'Fournisseurs',
        path: '/products/suppliers',
      },
      {
        id: 'brands',
        icon: <Tag className="h-5 w-5" />,
        label: 'Marques',
        path: '/products/brands',
      },
    ],
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
    path: '/rapports',
  });

  menuRegistry.addSidebarItem({
    id: 'settings',
    icon: <Settings className="h-6 w-6" />,
    label: 'Paramètres',
    path: '/settings',
    children: [
      {
        id: 'lcd-config',
        icon: <Monitor className="h-5 w-5" />,
        label: 'Écran LCD',
        path: '/settings/lcd',
      },
      {
        id: 'printer-config',
        icon: <Printer className="h-5 w-5" />,
        label: 'Imprimante POS',
        path: '/settings/printer',
      },
      {
        id: 'general-settings',
        icon: <Cog className="h-5 w-5" />,
        label: 'Général',
        path: '/settings/general',
      },
    ],
  });
}

export function updateActiveMenuItem() {
  const currentPath = window.location.pathname;

  menuRegistry.getSidebarItems().forEach((item) => {
    menuRegistry.updateSidebarItem(item.id, {
      active: item.path === currentPath,
    });

    // Vérifier aussi les sous-éléments
    if (item.children) {
      item.children.forEach((child) => {
        if (child.path === currentPath) {
          menuRegistry.updateSidebarItem(item.id, { active: true });
        }
      });
    }
  });
}

// Ajouter un écouteur pour mettre à jour lors des changements de route
window.addEventListener('popstate', updateActiveMenuItem);

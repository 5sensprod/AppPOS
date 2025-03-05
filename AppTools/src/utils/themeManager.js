// src/utils/themeManager.js (Ajoutez ce fichier)
export const themeManager = {
  // Récupérer le thème depuis localStorage ou utiliser le thème système
  getTheme() {
    if (
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      return 'dark';
    }
    return 'light';
  },

  // Initialiser le thème au chargement
  initTheme() {
    if (this.getTheme() === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  // Basculer entre les thèmes
  toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    return this.getTheme();
  },
};

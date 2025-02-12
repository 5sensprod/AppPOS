# AppPOS

    ## Description
    Un système de point de vente (POS) API-First, conçu pour une gestion centralisée des ventes, des produits et des périphériques, avec synchronisation WooCommerce.

    ## Structure du Projet
    ```
    /AppPOS
      ├── /AppServe  (Serveur API REST avec Express + Gestion des périphériques)
      │   ├── /api  (Routes API REST)
      │   │   ├── products.js  (Gestion des produits)
      │   │   ├── sales.js  (Gestion des ventes)
      │   │   ├── users.js  (Gestion des utilisateurs)
      │   │   ├── wooSync.js  (Synchronisation WooCommerce)
      │   ├── /peripherals  (Gestion du matériel : scanner, imprimante, écran LCD)
      │   │   ├── printer.js  (Gestion de l’imprimante)
      │   │   ├── scanner.js  (Gestion du scanner)
      │   │   ├── display.js  (Gestion de l’écran LCD)
      │   ├── /data  (Base de données locale SQLite)
      │   ├── /config  (Fichiers de configuration .env, settings)
      │   ├── /logs  (Fichiers logs des erreurs et événements)
      │   ├── server.js  (Serveur Express principal)
      │   ├── package.json  (Dépendances backend)
      │
      ├── /AppTools  (Frontend : Electron + React + Serveur Express pour Web)
      │   ├── /src  (Code source React pour l’interface)
      │   │   ├── /components  (Composants réutilisables)
      │   │   ├── /pages  (Pages principales)
      │   │   ├── /services  (Appels API vers AppServe)
      │   │   ├── /hooks  (Hooks React personnalisés)
      │   │   ├── App.js  (Composant principal)
      │   ├── /modules  (Modules Electron + Web)
      │   │   ├── /stock  (Gestion des produits, fournisseurs, catégories)
      │   │   ├── /cash  (Caisse, paiements, facturation)
      │   │   ├── /site  (Synchronisation WooCommerce)
      │   │   ├── /stick  (Impression des étiquettes)
      │   ├── /build  (Version buildée de l’application React)
      │   ├── main.js  (Processus principal Electron)
      │   ├── preload.js  (Communication entre Electron et Express)
      │   ├── server.js  (Serveur Express pour exposer les modules Web)
      │   ├── tray.js  (Gestion de l’icône Tray dans Windows)
      │   ├── package.json  (Dépendances frontend)
      │
      ├── /scripts  (Automatisation et outils de build)
      │   ├── start-dev.sh  (Script pour lancer le développement)
      │   ├── build.sh  (Script pour le build final)
      │   ├── update-appserve.bat  (Script de mise à jour du backend)
      │
      ├── .gitignore  (Fichiers à ignorer pour Git)
      ├── README.md  (Documentation du projet)
      ├── package.json  (Gestion des scripts et des dépendances globales)
    ```

    ## Scripts
    - `start-dev.sh`: Lance le développement du serveur et de l'interface.
    - `build.sh`: Construit l'application React.
    - `update-appserve.bat`: Met à jour le serveur AppServe.

    ## Dépendances
    - `express`: Serveur web.
    - `sqlite3`: Base de données locale.
    - `serialport`: Gestion des périphériques COM.
    - `@woocommerce/woocommerce-rest-api`: API WooCommerce.
    - `electron`: Application bureau.
    - `react`: Interface utilisateur.
    - `axios`: Appels API.
    - `vite`: Serveur de développement et build.

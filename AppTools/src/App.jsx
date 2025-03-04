// src/App.jsx
import React from 'react';
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';
import Auth, { AuthProvider } from './components/Auth';
import CategoryGrid from './components/CategoryGrid';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">AppStock POS v2.02</h1>
          <UpdateChecker />

          <div className="mt-6 mb-6">
            <Auth />
          </div>

          <div className="mt-6 mb-6">
            {/* Envelopper le composant CategoryGrid dans une Suspense pour gérer les erreurs de chargement */}
            <React.Suspense fallback={<div>Chargement des catégories...</div>}>
              <CategoryGrid />
            </React.Suspense>
          </div>

          <div className="mt-6">
            <ApiTest />
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;

// Mise à jour de src/App.jsx
import React, { useEffect } from 'react';
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';
import Login from './components/Login';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';

function App() {
  return (
    <AuthProvider>
      <MainLayout>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">AppStock</h1>
          <UpdateChecker />
          <div className="mt-6">
            <ApiTest />
            <Login />
          </div>
        </div>
      </MainLayout>
    </AuthProvider>
  );
}

export default App;

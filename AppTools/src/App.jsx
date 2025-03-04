// src/App.jsx
import React from 'react';
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';
import Login from './components/Login';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">AppStock</h1>
          <UpdateChecker />
          <div className="mt-6">
            <ApiTest />
            <Login />
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;

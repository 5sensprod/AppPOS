// src/App.jsx
import React from 'react';
import ApiTest from './components/ApiTest';
import UpdateChecker from './components/UpdateChecker';

function App() {
  return (
    <div className="App">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">AppStock</h1>
        <UpdateChecker />
        <div className="mt-6">
          <ApiTest />
        </div>
      </div>
    </div>
  );
}

export default App;

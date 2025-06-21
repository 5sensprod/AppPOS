const fs = require('fs');
const path = require('path');

const markerPath = path.join(__dirname, '..', 'AppServe', '.electron-production');
fs.writeFileSync(
  markerPath,
  JSON.stringify({
    isProduction: true,
    buildDate: new Date().toISOString(),
  })
);

console.log('✅ Marqueur production créé dans:', markerPath);

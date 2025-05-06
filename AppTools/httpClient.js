// AppTools/httpClient.js
const http = require('http');
const https = require('https');

// Utilitaire HTTP simple sans dépendances externes
function createHttpClient(baseURL) {
  // Détermine le protocole à utiliser
  const isHttps = baseURL.startsWith('https://');
  const httpModule = isHttps ? https : http;

  return {
    // Fonction générique pour les requêtes HTTP
    request(method, path, data = null, headers = {}) {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseURL);

        const options = {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
        };

        // Préparer les données si nécessaire
        let jsonData = null;
        if (data) {
          jsonData = JSON.stringify(data);
          options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        // Créer la requête
        const req = httpModule.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                resolve({
                  data: responseData ? JSON.parse(responseData) : {},
                  status: res.statusCode,
                });
              } catch (e) {
                resolve({
                  data: responseData,
                  status: res.statusCode,
                });
              }
            } else {
              reject({
                response: {
                  status: res.statusCode,
                  data: responseData ? JSON.parse(responseData) : {},
                },
              });
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        if (jsonData) {
          req.write(jsonData);
        }

        req.end();
      });
    },

    // Méthodes HTTP courantes
    get(path, headers = {}) {
      return this.request('GET', path, null, headers);
    },

    post(path, data, headers = {}) {
      return this.request('POST', path, data, headers);
    },

    put(path, data, headers = {}) {
      return this.request('PUT', path, data, headers);
    },

    delete(path, headers = {}) {
      return this.request('DELETE', path, null, headers);
    },
  };
}

module.exports = createHttpClient;

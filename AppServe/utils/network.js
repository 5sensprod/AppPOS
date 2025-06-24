// utils/network.js - MISE À JOUR SIMPLE
const os = require('os');
const net = require('net');

// Import de la bibliothèque bonjour standard
let bonjour = null;
let publishedServices = [];

try {
  bonjour = require('bonjour')();
  console.log('Bonjour initialisé avec succès');
} catch (err) {
  console.error("Erreur lors de l'initialisation de Bonjour:", err);
}

/**
 * ✅ FONCTION AMÉLIORÉE - Récupère l'adresse IP locale (IPv4) en évitant VPN/VM
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const validAddresses = [];

  // ✅ Patterns d'interfaces à éviter (VPN, VM, etc.)
  const blacklistedPatterns = [
    /^100\./, // Plages CGNAT/VPN comme 100.127.x.x
    /^172\.16\./,
    /^172\.17\./,
    /^172\.18\./,
    /^172\.19\./, // Docker
    /^10\.0\.53\./, // Hyper-V
    /^192\.168\.56\./, // VirtualBox
    /^169\.254\./, // Link-local (APIPA)
  ];

  // ✅ Noms d'interfaces à éviter
  const blacklistedNames = [
    'VMware',
    'VirtualBox',
    'Hyper-V',
    'TAP-Windows',
    'OpenVPN',
    'Hamachi',
    'ZeroTier',
    'Tailscale',
    'WireGuard',
    'vEthernet',
    'docker',
    'br-',
    'vboxnet',
    'vmnet',
  ];

  for (const interfaceName in interfaces) {
    // ✅ Ignorer les interfaces suspectes par nom
    const isSuspiciousName = blacklistedNames.some((name) =>
      interfaceName.toLowerCase().includes(name.toLowerCase())
    );

    if (isSuspiciousName) {
      console.log(`🚫 [NETWORK] Interface ignorée: ${interfaceName}`);
      continue;
    }

    const networkInterface = interfaces[interfaceName];
    for (const network of networkInterface) {
      if (network.family === 'IPv4' && !network.internal) {
        // ✅ Vérifier si l'IP correspond à un pattern suspect
        const isSuspiciousIp = blacklistedPatterns.some((pattern) => pattern.test(network.address));

        if (isSuspiciousIp) {
          console.log(`🚫 [NETWORK] IP VPN/VM ignorée: ${network.address}`);
          continue;
        }

        console.log(`✅ [NETWORK] IP valide: ${network.address} (${interfaceName})`);
        validAddresses.push({
          address: network.address,
          interface: interfaceName,
          priority: getInterfacePriority(interfaceName),
        });
      }
    }
  }

  if (validAddresses.length === 0) {
    console.warn('⚠️ [NETWORK] Aucune IP valide trouvée');
    return 'Adresse IP non trouvée';
  }

  // ✅ Trier par priorité (ethernet > wifi > autres)
  validAddresses.sort((a, b) => b.priority - a.priority);

  const selectedIp = validAddresses[0].address;
  console.log(
    `🌐 [NETWORK] IP principale sélectionnée: ${selectedIp} (${validAddresses[0].interface})`
  );

  return selectedIp;
}

/**
 * ✅ NOUVELLE - Fonction pour prioriser les interfaces
 */
function getInterfacePriority(interfaceName) {
  const name = interfaceName.toLowerCase();

  // Ethernet = priorité maximale
  if (name.includes('ethernet') || name.includes('eth') || name.startsWith('en')) {
    return 100;
  }

  // WiFi = priorité haute
  if (name.includes('wi-fi') || name.includes('wifi') || name.includes('wlan')) {
    return 80;
  }

  // Autres interfaces physiques
  if (name.includes('local area connection')) {
    return 60;
  }

  // Par défaut = priorité basse
  return 10;
}

/**
 * ✅ NOUVELLE - Récupère toutes les adresses IP valides
 */
function getAllLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    for (const network of networkInterface) {
      if (network.family === 'IPv4' && !network.internal) {
        addresses.push(network.address);
      }
    }
  }
  return addresses;
}

/**
 * ✅ NOUVELLE - Diagnostic réseau complet
 */
function diagnoseNetwork() {
  console.log('\n=== DIAGNOSTIC RÉSEAU ===');
  const interfaces = os.networkInterfaces();

  for (const interfaceName in interfaces) {
    console.log(`\n🔍 Interface: ${interfaceName}`);

    for (const iface of interfaces[interfaceName]) {
      if (iface.family === 'IPv4') {
        const status = iface.internal ? '🏠 interne' : '🌐 externe';
        console.log(`   ${status} ${iface.address}`);
      }
    }
  }

  console.log(`\n⭐ IP principale: ${getLocalIpAddress()}`);
  console.log('========================\n');
}

/**
 * Vérifie si un port est disponible
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Trouve un port disponible
 */
async function findAvailablePort(startPort, maxPort = startPort + 50) {
  let currentPort = startPort;
  while (currentPort <= maxPort) {
    if (await isPortAvailable(currentPort)) {
      return currentPort;
    }
    currentPort++;
  }
  throw new Error(`Aucun port disponible trouvé entre ${startPort} et ${maxPort}`);
}

/**
 * Publie un service mDNS
 */
function publishService(name, type, port, metadata = {}) {
  if (!bonjour) {
    console.warn('Publication mDNS impossible: service Bonjour non disponible');
    return null;
  }

  try {
    const service = bonjour.publish({
      name: name,
      type: type,
      port: port,
      txt: metadata,
    });

    publishedServices.push(service);
    console.log(`Service mDNS publié: ${name}.local (${type}) sur le port ${port}`);
    return service;
  } catch (err) {
    console.error(`Erreur lors de la publication du service mDNS:`, err);
    return null;
  }
}

/**
 * Nettoie les services mDNS
 */
function cleanupMdnsServices() {
  if (publishedServices.length > 0) {
    publishedServices.forEach((service) => {
      try {
        if (service && service.stop) {
          service.stop();
        }
      } catch (err) {
        console.error(`Erreur lors de l'arrêt du service:`, err);
      }
    });
    publishedServices = [];
  }

  if (bonjour) {
    try {
      bonjour.destroy();
    } catch (err) {
      console.error(`Erreur lors de la destruction de Bonjour:`, err);
    }
    bonjour = null;
  }
}

module.exports = {
  getLocalIpAddress, // ✅ MÊME NOM - Fonction améliorée
  getAllLocalIpAddresses, // ✅ NOUVELLE - Pour récupérer toutes les IPs
  diagnoseNetwork, // ✅ NOUVELLE - Diagnostic
  isPortAvailable,
  findAvailablePort,
  publishService,
  cleanupMdnsServices,
};

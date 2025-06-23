// services/lcdDisplayService.js - Version avec Queue ultra-robuste
const { SerialPort } = require('serialport');

class LCDDisplayService {
  constructor() {
    this.port = null;
    this.connectedDisplay = null;
    this.displayConfig = {
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      lines: 2,
      charactersPerLine: 20,
    };

    // ✅ SYSTÈME DE QUEUE ULTRA-ROBUSTE
    this.operationQueue = [];
    this.isProcessingQueue = false;
    this.lastOperation = null;
    this.operationCounter = 0;
    this.lastDisplayedContent = null;
    this.queueStats = {
      totalOperations: 0,
      skippedOperations: 0,
      errors: 0,
      averageTime: 0,
    };
    // ✅ NOUVEAU : Monitoring LCD
    this.healthCheck = {
      isMonitoring: false,
      interval: null,
      lastSuccessfulWrite: null,
      consecutiveFailures: 0,
      maxFailures: 3,
      checkIntervalMs: 5000, // 5 secondes
    };

    // ✅ NOUVEAU : État de connexion
    this.connectionState = {
      isConnected: false,
      wasConnected: false,
      lastDisconnectedAt: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
    };

    // ✅ NOUVEAU : Gestion des erreurs
    this.errorHandling = {
      isHandlingError: false,
      lastError: null,
      errorCount: 0,
    };
  }

  // ✅ NOUVEAU : Démarrer monitoring
  startHealthMonitoring() {
    if (this.healthCheck.isMonitoring) return;

    console.log('🔍 [LCD MONITOR] Démarrage du monitoring LCD');
    this.healthCheck.isMonitoring = true;

    this.healthCheck.interval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheck.checkIntervalMs);
  }

  // ✅ NOUVEAU : Arrêter monitoring
  stopHealthMonitoring() {
    if (!this.healthCheck.isMonitoring) return;

    console.log('🛑 [LCD MONITOR] Arrêt du monitoring LCD');
    this.healthCheck.isMonitoring = false;

    if (this.healthCheck.interval) {
      clearInterval(this.healthCheck.interval);
      this.healthCheck.interval = null;
    }
  }

  // ✅ QUEUE AVEC PRIORITÉ ET DÉDUPLICATION
  async queueOperation(operation, operationType = 'write', priority = 0, operationData = null) {
    return new Promise((resolve, reject) => {
      const operationId = ++this.operationCounter;

      // ✅ DÉDUPLICATION INTELLIGENTE
      if (this.shouldSkipDuplicate(operationType, operationData)) {
        console.debug(`⏭️ LCD Queue: Skip ${operationId} (${operationType}) - duplicate`);
        this.queueStats.skippedOperations++;
        resolve({ skipped: true, reason: 'duplicate' });
        return;
      }

      const queuedOperation = {
        id: operationId,
        type: operationType,
        priority,
        operation,
        data: operationData,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 2,
      };

      // ✅ INSERTION SELON PRIORITÉ
      const insertIndex = this.operationQueue.findIndex((op) => op.priority < priority);
      if (insertIndex === -1) {
        this.operationQueue.push(queuedOperation);
      } else {
        this.operationQueue.splice(insertIndex, 0, queuedOperation);
      }

      console.debug(
        `📝 LCD Queue: Ajout ${operationId} (${operationType}), queue: ${this.operationQueue.length}`
      );

      // ✅ DÉMARRER LE PROCESSEUR
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  setupPortErrorHandlers() {
    if (!this.port) return;

    // Gestionnaire d'erreur principal
    this.port.on('error', (error) => {
      this.handlePortError(error);
    });

    // Gestionnaire fermeture inattendue
    this.port.on('close', (error) => {
      if (error) {
        console.warn(`⚠️ [LCD ERROR] Port fermé avec erreur:`, error);
        this.handlePortError(error);
      } else {
        console.log(`🔌 [LCD] Port fermé proprement`);
      }
    });

    // Gestionnaire déconnexion
    this.port.on('disconnect', (error) => {
      console.warn(`🔌 [LCD ERROR] Port déconnecté:`, error || 'Raison inconnue');
      this.handlePortError(error || new Error('Port déconnecté'));
    });
  }

  // ✅ NOUVEAU : Gestion centralisée des erreurs port
  handlePortError(error) {
    // Éviter gestion multiple simultanée
    if (this.errorHandling.isHandlingError) {
      return;
    }

    this.errorHandling.isHandlingError = true;
    this.errorHandling.lastError = error;
    this.errorHandling.errorCount++;

    console.error(`🚨 [LCD ERROR] Erreur port détectée:`, error.message);

    // Marquer comme déconnecté
    if (this.connectionState.isConnected) {
      this.handleLCDDisconnected(error);
    }

    // Reset flag après traitement
    setTimeout(() => {
      this.errorHandling.isHandlingError = false;
    }, 1000);
  }

  // ✅ NOUVEAU : Vérification de santé LCD
  async performHealthCheck() {
    if (!this.connectedDisplay?.connected || !this.port?.isOpen) {
      return;
    }

    // Éviter check pendant gestion d'erreur
    if (this.errorHandling.isHandlingError) {
      return;
    }

    try {
      await this.testLCDConnection();

      // ✅ Success
      this.healthCheck.lastSuccessfulWrite = Date.now();
      this.healthCheck.consecutiveFailures = 0;

      // Si on était déconnecté, notifier reconnexion
      if (!this.connectionState.isConnected && this.connectionState.wasConnected) {
        this.handleLCDReconnected();
      }

      this.connectionState.isConnected = true;
      this.connectionState.wasConnected = true;
    } catch (error) {
      this.healthCheck.consecutiveFailures++;

      console.warn(
        `⚠️ [LCD MONITOR] Échec health check ${this.healthCheck.consecutiveFailures}/${this.healthCheck.maxFailures}:`,
        error.message
      );

      // Si trop d'échecs consécutifs = déconnexion détectée
      if (this.healthCheck.consecutiveFailures >= this.healthCheck.maxFailures) {
        this.handleLCDDisconnected(error);
      }
    }
  }

  // ✅ NOUVEAU : Test silencieux de connexion
  async testLCDConnection() {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.port.isOpen) {
        reject(new Error('Port non ouvert'));
        return;
      }

      // ✅ NOUVEAU : Vérifier si port en erreur
      if (this.errorHandling.isHandlingError) {
        reject(new Error("Port en cours de gestion d'erreur"));
        return;
      }

      // Timeout plus court pour health check
      const timeout = setTimeout(() => {
        reject(new Error('Timeout test connexion LCD'));
      }, 1000); // 1s au lieu de 2s

      try {
        // Test avec caractère null (invisible)
        this.port.write('\0', (error) => {
          clearTimeout(timeout);
          if (error) {
            reject(new Error(`Test connexion échoué: ${error.message}`));
          } else {
            this.port.drain((drainError) => {
              if (drainError) {
                reject(new Error(`Test drain échoué: ${drainError.message}`));
              } else {
                resolve();
              }
            });
          }
        });
      } catch (writeError) {
        clearTimeout(timeout);
        reject(new Error(`Erreur écriture test: ${writeError.message}`));
      }
    });
  }

  // ✅ NOUVEAU : Gestion déconnexion détectée
  handleLCDDisconnected(error) {
    if (!this.connectionState.isConnected) {
      return; // Déjà en état déconnecté
    }

    console.error('🚨 [LCD MONITOR] Déconnexion LCD détectée:', error.message);

    this.connectionState.isConnected = false;
    this.connectionState.lastDisconnectedAt = Date.now();
    this.connectionState.reconnectAttempts = 0;

    // Arrêter la queue pour éviter erreurs en cascade
    this.operationQueue = [];
    this.isProcessingQueue = false;

    // ✅ ÉMETTRE ÉVÉNEMENT WEBSOCKET
    try {
      const apiEventEmitter = require('./apiEventEmitter');
      apiEventEmitter.emit('lcd.connection.lost', {
        port: this.connectedDisplay?.path,
        owner: this.getOwnerInfo(),
        error: error.message,
        timestamp: Date.now(),
      });
    } catch (emitError) {
      console.error('[LCD ERROR] Erreur émission événement:', emitError.message);
    }

    // Fermer le port défaillant proprement
    this.closePortSafely();

    // Démarrer tentatives de reconnexion
    setTimeout(() => {
      this.startReconnectionAttempts();
    }, 2000); // Délai avant première tentative
  }

  async closePortSafely() {
    if (!this.port) return;

    try {
      // Supprimer les listeners pour éviter events en cascade
      this.port.removeAllListeners('error');
      this.port.removeAllListeners('close');
      this.port.removeAllListeners('disconnect');

      if (this.port.isOpen) {
        await new Promise((resolve) => {
          this.port.close(() => {
            resolve(); // Toujours résoudre, même si erreur
          });
        });
      }
    } catch (error) {
      console.warn('[LCD] Erreur fermeture port (ignorée):', error.message);
    } finally {
      this.port = null;
    }
  }

  // ✅ MODIFICATION : closePort avec fermeture sécurisée
  async closePort() {
    // Vider la queue avant fermeture
    this.operationQueue = [];
    this.isProcessingQueue = false;

    await this.closePortSafely();
  }

  // ✅ NOUVEAU : Gestion reconnexion réussie
  handleLCDReconnected() {
    console.log('🔌 [LCD MONITOR] Reconnexion LCD réussie');

    this.connectionState.isConnected = true;
    this.connectionState.reconnectAttempts = 0;

    // ✅ NOUVEAU : Message de reconnexion immédiat
    setTimeout(async () => {
      try {
        await this.writeToDisplay('Reconnexion', 'LCD reussie');

        // Puis welcome après 2s
        setTimeout(async () => {
          await this.showWelcomeMessage();
        }, 2000);
      } catch (error) {
        console.debug('[LCD] Erreur message reconnexion:', error.message);
      }
    }, 500);

    // Émettre événement WebSocket
    const apiEventEmitter = require('./apiEventEmitter');
    apiEventEmitter.emit('lcd.connection.restored', {
      port: this.connectedDisplay?.path,
      owner: this.getOwnerInfo(),
      timestamp: Date.now(),
    });
  }

  // ✅ NOUVEAU : Tentatives de reconnexion automatique
  startReconnectionAttempts() {
    if (!this.connectedDisplay?.path) {
      console.warn('[LCD MONITOR] Pas de port à reconnecter');
      return;
    }

    const reconnectInterval = setInterval(async () => {
      if (this.connectionState.reconnectAttempts >= this.connectionState.maxReconnectAttempts) {
        console.error('🚨 [LCD MONITOR] Max tentatives reconnexion atteint - abandon');
        clearInterval(reconnectInterval);

        // Émettre échec reconnexion
        try {
          const apiEventEmitter = require('./apiEventEmitter');
          apiEventEmitter.emit('lcd.connection.failed', {
            port: this.connectedDisplay.path,
            owner: this.getOwnerInfo(),
            attempts: this.connectionState.reconnectAttempts,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('[LCD] Erreur émission échec reconnexion:', error.message);
        }
        return;
      }

      this.connectionState.reconnectAttempts++;
      console.log(
        `🔄 [LCD MONITOR] Tentative reconnexion ${this.connectionState.reconnectAttempts}/${this.connectionState.maxReconnectAttempts}`
      );

      try {
        // Reset états avant tentative
        this.errorHandling.isHandlingError = false;

        // Tentative de reconnexion sur le même port
        await this.connectToDisplay(this.connectedDisplay.path, this.connectedDisplay.config);

        console.log('✅ [LCD MONITOR] Reconnexion automatique réussie');
        clearInterval(reconnectInterval);
      } catch (error) {
        console.warn(
          `⚠️ [LCD MONITOR] Tentative ${this.connectionState.reconnectAttempts} échouée:`,
          error.message
        );
      }
    }, 3000); // Tentative toutes les 3 secondes
  }

  // ✅ DÉDUPLICATION AVANCÉE
  shouldSkipDuplicate(operationType, operationData) {
    // Skip si opération identique récente
    if (!this.lastOperation || !operationData) return false;

    const timeDiff = Date.now() - this.lastOperation.timestamp;
    if (timeDiff > 1000) return false; // Plus de 1s = autoriser

    // Skip les writes identiques
    if (operationType === 'write' && this.lastOperation.type === 'write') {
      if (this.lastDisplayedContent && operationData) {
        const isSameContent =
          this.lastDisplayedContent.line1 === operationData.line1 &&
          this.lastDisplayedContent.line2 === operationData.line2;

        if (isSameContent && timeDiff < 500) {
          return true; // Skip si contenu identique dans les 500ms
        }
      }
    }

    return false;
  }

  // ✅ PROCESSEUR DE QUEUE SÉQUENTIEL AVEC RETRY
  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    console.debug(`🚀 LCD Queue: Démarrage processeur (${this.operationQueue.length} opérations)`);

    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      const startTime = Date.now();

      try {
        console.debug(`⚡ LCD Queue: Traitement ${operation.id} (${operation.type})`);

        // ✅ DÉLAI ANTI-COLLISION INTELLIGENT
        if (this.lastOperation) {
          const timeSinceLastOp = Date.now() - this.lastOperation.endTime;
          if (timeSinceLastOp < 200) {
            const waitTime = 200 - timeSinceLastOp;
            console.debug(`⏱️ LCD Queue: Attente ${waitTime}ms anti-collision`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }

        // ✅ EXÉCUTION AVEC TIMEOUT
        const result = await Promise.race([
          operation.operation(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LCD operation timeout')), 5000)
          ),
        ]);

        const operationTime = Date.now() - startTime;

        // ✅ MISE À JOUR STATISTIQUES
        this.queueStats.totalOperations++;
        this.queueStats.averageTime =
          (this.queueStats.averageTime * (this.queueStats.totalOperations - 1) + operationTime) /
          this.queueStats.totalOperations;

        // ✅ MÉMORISER DERNIÈRE OPÉRATION
        this.lastOperation = {
          type: operation.type,
          timestamp: startTime,
          endTime: Date.now(),
          id: operation.id,
          data: operation.data,
        };

        // ✅ MÉMORISER CONTENU AFFICHÉ
        if (operation.type === 'write' && operation.data) {
          this.lastDisplayedContent = {
            line1: operation.data.line1,
            line2: operation.data.line2,
            timestamp: Date.now(),
          };
        }

        console.debug(`✅ LCD Queue: ${operation.id} terminé en ${operationTime}ms`);
        operation.resolve(result);
      } catch (error) {
        console.error(`❌ LCD Queue: Erreur ${operation.id}:`, error.message);

        // ✅ SYSTÈME DE RETRY
        if (operation.retries < operation.maxRetries) {
          operation.retries++;
          console.debug(
            `🔄 LCD Queue: Retry ${operation.id} (tentative ${operation.retries}/${operation.maxRetries})`
          );

          // Remettre en queue avec priorité élevée
          operation.priority = 10;
          this.operationQueue.unshift(operation);

          // Attente progressive
          await new Promise((resolve) => setTimeout(resolve, operation.retries * 500));
          continue;
        }

        this.queueStats.errors++;
        operation.reject(error);
      }

      // ✅ MICRO-PAUSE entre opérations
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    this.isProcessingQueue = false;
    console.debug(`🏁 LCD Queue: Processeur terminé. Stats: ${JSON.stringify(this.queueStats)}`);
  }

  // ✅ MÉTHODE WRITE AVEC QUEUE ROBUSTE
  async writeToDisplay(line1 = '', line2 = '', priority = 0) {
    if (!this.connectedDisplay?.connected || !this.port?.isOpen) {
      throw new Error('LCD non connecté');
    }

    const formattedLine1 = this.formatLine(line1);
    const formattedLine2 = this.formatLine(line2);

    const operationData = { line1: formattedLine1, line2: formattedLine2 };

    return await this.queueOperation(
      async () => {
        // ✅ CLEAR INTELLIGENT - seulement si vraiment différent
        const needsClear = this.shouldClearDisplay(formattedLine1, formattedLine2);
        if (needsClear) {
          await this.clearDisplayDirect();
        }

        // ✅ ÉCRITURE DIRECTE OPTIMISÉE
        const message = `${formattedLine1}\r\n${formattedLine2}`;

        return new Promise((resolve, reject) => {
          this.port.write(message, (error) => {
            if (error) {
              reject(new Error(`Erreur écriture LCD: ${error.message}`));
            } else {
              this.port.drain((drainError) => {
                if (drainError) {
                  reject(new Error(`Erreur drain LCD: ${drainError.message}`));
                } else {
                  resolve({
                    success: true,
                    message: 'Message affiché',
                    content: operationData,
                  });
                }
              });
            }
          });
        });
      },
      'write',
      priority,
      operationData
    );
  }

  // ✅ CLEAR INTELLIGENT
  shouldClearDisplay(line1, line2) {
    if (!this.lastDisplayedContent) return true;

    const isDifferent =
      this.lastDisplayedContent.line1 !== line1 || this.lastDisplayedContent.line2 !== line2;

    // Clear seulement si contenu différent et pas trop récent
    const timeSinceLastDisplay = Date.now() - (this.lastDisplayedContent.timestamp || 0);
    return isDifferent && timeSinceLastDisplay > 100;
  }

  // ✅ CLEAR DIRECT (sans queue pour éviter deadlock)
  async clearDisplayDirect() {
    if (!this.connectedDisplay?.connected || !this.port?.isOpen) {
      throw new Error('LCD non connecté pour clear');
    }

    try {
      // ✅ SÉQUENCE CLEAR OPTIMISÉE
      const operations = [
        ' '.repeat(20) + '\r\n' + ' '.repeat(20), // Espaces
        '\x0C\x1A', // Codes de contrôle
        ' '.repeat(20) + '\r\n' + ' '.repeat(20), // Espaces final
      ];

      for (const op of operations) {
        await new Promise((resolve, reject) => {
          this.port.write(op, (error) => {
            if (error) reject(error);
            else this.port.drain(resolve);
          });
        });
        await new Promise((resolve) => setTimeout(resolve, 30)); // Pause courte
      }

      return { success: true, message: 'LCD effacé' };
    } catch (error) {
      throw new Error(`Erreur clear LCD: ${error.message}`);
    }
  }

  // ✅ MÉTHODE CLEAR PUBLIQUE AVEC QUEUE
  async clearDisplay() {
    return await this.queueOperation(
      () => this.clearDisplayDirect(),
      'clear',
      5 // Priorité élevée pour clear
    );
  }

  // ✅ FORMATAGE OPTIMISÉ
  formatLine(text) {
    if (!text) return '';
    return String(text)
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[€]/g, 'EUR')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 20);
  }

  // ✅ LISTE DES PORTS (inchangé)
  async listAvailablePorts() {
    try {
      const ports = await SerialPort.list();
      return ports
        .filter((port) => port.path && port.path.includes('COM'))
        .map((port) => ({
          path: port.path,
          description: port.friendlyName || port.manufacturer || 'Port série',
          type: 'serial',
          platform: 'windows',
          method: 'serialport',
          available: true,
        }));
    } catch (error) {
      console.error('Erreur listing ports:', error);
      return [];
    }
  }

  // ✅ CONNEXION (inchangé mais avec reset queue)
  // ✅ connectToDisplay COMPLET avec message reconnexion
  async connectToDisplay(portPath, config = {}) {
    try {
      const finalConfig = { ...this.displayConfig, ...config };

      // ✅ RESET QUEUE ET STATS
      this.operationQueue = [];
      this.isProcessingQueue = false;
      this.lastOperation = null;
      this.lastDisplayedContent = null;
      this.queueStats = {
        totalOperations: 0,
        skippedOperations: 0,
        errors: 0,
        averageTime: 0,
      };
      this.errorHandling.isHandlingError = false;

      // Fermer port existant
      if (this.port && this.port.isOpen) {
        await this.closePort();
      }

      console.info(`🔌 Connexion LCD sur ${portPath}...`);

      this.port = new SerialPort({
        path: portPath,
        baudRate: finalConfig.baudRate,
        dataBits: finalConfig.dataBits,
        parity: finalConfig.parity,
        stopBits: finalConfig.stopBits,
        autoOpen: false,
      });

      // ✅ GESTIONNAIRES D'ERREURS AVANT OUVERTURE
      this.setupPortErrorHandlers();

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout connexion LCD (3s)'));
        }, 3000);

        this.port.open((error) => {
          clearTimeout(timeout);
          if (error) {
            reject(new Error(`Erreur ouverture port: ${error.message}`));
          } else {
            resolve();
          }
        });
      });

      this.connectedDisplay = {
        type: 'serial',
        path: portPath,
        config: finalConfig,
        connected: true,
        connectedAt: new Date(),
      };

      // ✅ INITIALISATION : Clear d'abord
      await this.clearDisplay();

      // ✅ NOUVEAU : Gestion message reconnexion
      const isReconnection = this.connectionState.reconnectAttempts > 0;

      if (isReconnection) {
        console.log('📱 [LCD] Affichage message reconnexion...');

        // Message reconnexion DIRECT (sans queue pour être sûr)
        const reconnectMessage = 'Reconnexion\r\nLCD reussie';
        await new Promise((resolve, reject) => {
          this.port.write(reconnectMessage, (error) => {
            if (error) {
              console.error('[LCD] Erreur écriture reconnexion:', error.message);
              reject(error);
            } else {
              this.port.drain((drainError) => {
                if (drainError) {
                  console.error('[LCD] Erreur drain reconnexion:', drainError.message);
                  reject(drainError);
                } else {
                  console.log('✅ [LCD] Message reconnexion affiché');
                  resolve();
                }
              });
            }
          });
        });

        console.log('📡 [LCD] Émission event reconnexion...');
        const apiEventEmitter = require('./apiEventEmitter');
        apiEventEmitter.emit('lcd.connection.restored', {
          port: portPath,
          owner: this.getOwnerInfo(),
          timestamp: Date.now(),
        });

        // Welcome après 2s
        setTimeout(() => {
          this.showWelcomeMessage().catch((error) => {
            console.debug('[LCD] Erreur welcome post-reconnexion:', error.message);
          });
        }, 2000);
      } else {
        // Première connexion = pas de message reconnexion
        console.log('📱 [LCD] Première connexion - pas de message reconnexion');
      }

      // ✅ DÉMARRER MONITORING APRÈS CONNEXION
      this.startHealthMonitoring();
      this.connectionState.isConnected = true;
      this.connectionState.wasConnected = true;

      console.info(`✅ LCD connecté sur ${portPath} avec monitoring actif`);

      return {
        success: true,
        message: `LCD connecté sur ${portPath}`,
        config: finalConfig,
        monitoring: true,
        reconnection: isReconnection,
      };
    } catch (error) {
      await this.closePort();
      throw new Error(`Connexion LCD impossible: ${error.message}`);
    }
  }

  // ✅ FERMETURE PROPRE
  async closePort() {
    // Vider la queue avant fermeture
    this.operationQueue = [];
    this.isProcessingQueue = false;

    if (this.port && this.port.isOpen) {
      try {
        await new Promise((resolve) => {
          this.port.close(resolve);
        });
      } catch (error) {
        console.warn('Erreur fermeture port:', error.message);
      }
    }
    this.port = null;
  }

  // ✅ DÉCONNEXION
  disconnect() {
    this.stopHealthMonitoring();
    this.connectionState.isConnected = false;
    this.connectionState.wasConnected = false;
    this.errorHandling.isHandlingError = false;

    this.closePortSafely();
    this.connectedDisplay = null;
    this.lastDisplayedContent = null;
  }

  // ✅ STATUT ENRICHI
  getStatus() {
    return {
      connected: this.connectedDisplay?.connected || false,
      display: this.connectedDisplay,
      config: this.displayConfig,
      port_open: this.port?.isOpen || false,
      queue: {
        length: this.operationQueue.length,
        processing: this.isProcessingQueue,
        stats: this.queueStats,
      },
      last_content: this.lastDisplayedContent,
      health: {
        monitoring: this.healthCheck.isMonitoring,
        last_check: this.healthCheck.lastSuccessfulWrite,
        consecutive_failures: this.healthCheck.consecutiveFailures,
        connection_state: this.connectionState.isConnected,
        was_connected: this.connectionState.wasConnected,
        reconnect_attempts: this.connectionState.reconnectAttempts,
      },
      // ✅ NOUVEAU : Infos erreur
      error_info: {
        handling_error: this.errorHandling.isHandlingError,
        last_error: this.errorHandling.lastError?.message || null,
        error_count: this.errorHandling.errorCount,
      },
    };
  }

  getOwnerInfo() {
    // Récupérer info propriétaire depuis cashierSessionService si disponible
    try {
      const cashierSessionService = require('./cashierSessionService');
      const lcdStatus = cashierSessionService.getLCDStatus();
      return lcdStatus?.owner || null;
    } catch (error) {
      return null;
    }
  }

  async manualReconnect() {
    if (!this.connectedDisplay?.path) {
      throw new Error('Aucun port à reconnecter');
    }

    console.log(`🔄 [LCD MONITOR] Reconnexion manuelle sur ${this.connectedDisplay.path}`);

    return await this.connectToDisplay(this.connectedDisplay.path, this.connectedDisplay.config);
  }

  // ✅ MESSAGES PRÉDÉFINIS AVEC QUEUE
  async showWelcomeMessage() {
    return await this.writeToDisplay('AXE Musique', 'Bienvenue', 8);
  }

  async showPrice(itemName, price) {
    const formattedPrice = `${parseFloat(price).toFixed(2)}EUR`;
    return await this.writeToDisplay(itemName, formattedPrice, 6);
  }

  async showTotal(total) {
    const formattedTotal = `${parseFloat(total).toFixed(2)}EUR`;
    return await this.writeToDisplay('TOTAL', formattedTotal, 7);
  }

  async showThankYou() {
    return await this.writeToDisplay('Merci !', 'Au revoir', 9);
  }

  async showError(errorMessage) {
    return await this.writeToDisplay('ERREUR', errorMessage, 10);
  }

  // ✅ DIAGNOSTIC QUEUE
  getQueueDiagnostic() {
    return {
      queue_length: this.operationQueue.length,
      processing: this.isProcessingQueue,
      stats: this.queueStats,
      last_operation: this.lastOperation,
      pending_operations: this.operationQueue.map((op) => ({
        id: op.id,
        type: op.type,
        priority: op.priority,
        retries: op.retries,
        age: Date.now() - op.timestamp,
      })),
    };
  }
}

module.exports = new LCDDisplayService();

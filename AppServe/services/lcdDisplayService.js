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

      // ✅ INITIALISATION AVEC QUEUE
      await this.clearDisplay();
      // await this.showWelcomeMessage();

      console.info(`✅ LCD connecté sur ${portPath} avec queue robuste`);

      return {
        success: true,
        message: `LCD connecté sur ${portPath}`,
        config: finalConfig,
        queueEnabled: true,
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
    this.closePort();
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
    };
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

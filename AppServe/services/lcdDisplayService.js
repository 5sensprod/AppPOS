// services/lcdDisplayService.js - Version Windows uniquement, propre
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

class LCDDisplayService {
  constructor() {
    this.connectedDisplay = null;
    this.displayConfig = {
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      lines: 2,
      charactersPerLine: 20,
    };
  }

  async listAvailablePorts() {
    try {
      const ports = [];

      // PowerShell
      try {
        const { stdout: psResult } = await execAsync(
          'powershell "Get-WmiObject -Class Win32_SerialPort | Select-Object DeviceID, Description, Name | ConvertTo-Json"'
        );
        if (psResult.trim()) {
          const psData = JSON.parse(psResult);
          const psDevices = Array.isArray(psData) ? psData : [psData];
          psDevices.forEach((device) => {
            if (device.DeviceID) {
              ports.push({
                path: device.DeviceID,
                description: device.Description || device.Name || 'Port série',
                type: 'serial',
                platform: 'windows',
                method: 'powershell',
              });
            }
          });
        }
      } catch (psError) {
        // Ignorer erreur
      }

      // Test direct COM1-20
      for (let i = 1; i <= 20; i++) {
        const testPort = `COM${i}`;
        try {
          await execAsync(`mode ${testPort}: >nul 2>&1`);
          if (!ports.find((p) => p.path === testPort)) {
            ports.push({
              path: testPort,
              description: 'Port série disponible',
              type: 'serial',
              platform: 'windows',
              method: 'direct_test',
            });
          }
        } catch (error) {
          // Port inexistant
        }
      }

      return ports;
    } catch (error) {
      return [];
    }
  }

  async connectToDisplay(portPath, config = {}) {
    try {
      const finalConfig = { ...this.displayConfig, ...config };

      // Configuration port série
      const parity =
        finalConfig.parity === 'none' ? 'N' : finalConfig.parity === 'even' ? 'E' : 'O';
      const cmd = `mode ${portPath}: BAUD=${finalConfig.baudRate} PARITY=${parity} DATA=${finalConfig.dataBits} STOP=${finalConfig.stopBits}`;
      await execAsync(cmd);

      this.connectedDisplay = {
        type: 'serial',
        path: portPath,
        config: finalConfig,
        connected: true,
      };

      // Message de bienvenue
      await this.clearDisplay();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.showWelcomeMessage();

      return { success: true, message: `Connecté sur ${portPath}`, config: finalConfig };
    } catch (error) {
      throw new Error(`Connexion impossible: ${error.message}`);
    }
  }

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

  async writeToDisplay(line1 = '', line2 = '') {
    if (!this.connectedDisplay?.connected) {
      throw new Error('Écran non connecté');
    }

    const formattedLine1 = this.formatLine(line1);
    const formattedLine2 = this.formatLine(line2);

    // Effacement automatique
    await this.clearDisplay();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Écriture (lignes inversées)
    const message = `${formattedLine2}\r\n${formattedLine1}`;
    const tempFile = path.join(require('os').tmpdir(), `lcd_${Date.now()}.txt`);

    try {
      fs.writeFileSync(tempFile, message, 'ascii');
      await execAsync(`type "${tempFile}" > ${this.connectedDisplay.path}`);

      return {
        success: true,
        message: 'Message envoyé',
        content: { line1: formattedLine1, line2: formattedLine2 },
      };
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }

  async clearDisplay() {
    if (!this.connectedDisplay?.connected) {
      throw new Error('Écran non connecté');
    }

    const tempFile = path.join(require('os').tmpdir(), `lcd_clear_${Date.now()}.txt`);

    try {
      // Méthode robuste en 3 étapes
      const fullBlank = ' '.repeat(20) + '\r\n' + ' '.repeat(20);
      fs.writeFileSync(tempFile, fullBlank, 'ascii');
      await execAsync(`type "${tempFile}" > ${this.connectedDisplay.path}`);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const ctrl = '\x0C\x1A\x0C';
      fs.writeFileSync(tempFile, ctrl, 'binary');
      await execAsync(`type "${tempFile}" > ${this.connectedDisplay.path}`);

      await new Promise((resolve) => setTimeout(resolve, 50));

      fs.writeFileSync(tempFile, fullBlank, 'ascii');
      await execAsync(`type "${tempFile}" > ${this.connectedDisplay.path}`);

      return { success: true, message: 'Écran effacé' };
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }

  disconnect() {
    if (this.connectedDisplay) {
      this.connectedDisplay = null;
    }
  }

  getStatus() {
    return {
      connected: this.connectedDisplay?.connected || false,
      display: this.connectedDisplay,
      config: this.displayConfig,
    };
  }

  // Messages prédéfinis
  async showWelcomeMessage() {
    return await this.writeToDisplay('AXE Musique', 'Bienvenue');
  }

  async showPrice(itemName, price) {
    return await this.writeToDisplay(itemName, `${parseFloat(price).toFixed(2)}EUR`);
  }

  async showTotal(total) {
    return await this.writeToDisplay('TOTAL', `${parseFloat(total).toFixed(2)}EUR`);
  }

  async showThankYou() {
    return await this.writeToDisplay('Merci !', 'Au revoir');
  }

  async showError(errorMessage) {
    return await this.writeToDisplay('ERREUR', errorMessage);
  }
}

module.exports = new LCDDisplayService();

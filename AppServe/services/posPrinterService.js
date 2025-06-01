// services/posPrinterService.js - Version Windows Printer
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

class POSPrinterService {
  constructor() {
    this.connectedPrinter = null;
    this.printerConfig = {
      paperWidth: 80,
      charactersPerLine: 48,
      maxLines: 1000,
      printMethod: 'windows',
    };

    this.escCommands = {
      init: '\x1B\x40',
      cut: '\x1D\x56\x41',
      cutFull: '\x1D\x56\x00',
      feed: '\x0A',
      bold: '\x1B\x45\x01',
      boldOff: '\x1B\x45\x00',
      alignLeft: '\x1B\x61\x00',
      alignCenter: '\x1B\x61\x01',
      alignRight: '\x1B\x61\x02',
      doubleHeight: '\x1B\x21\x10',
      doubleWidth: '\x1B\x21\x20',
      normal: '\x1B\x21\x00',
      openCashDrawer: '\x1B\x70\x00\x19\xFA',
    };
  }

  async listAvailablePrinters() {
    const printers = [];

    try {
      const { stdout: printersResult } = await execAsync(
        'powershell "Get-WmiObject -Class Win32_Printer | Select-Object Name, PortName, DriverName, Status, Comment, Location | ConvertTo-Json"'
      );
      if (printersResult.trim()) {
        const printersData = JSON.parse(printersResult);
        const windowsPrinters = Array.isArray(printersData) ? printersData : [printersData];
        for (const printer of windowsPrinters) {
          if (printer.Name) {
            printers.push({
              name: printer.Name,
              portName: printer.PortName,
              driverName: printer.DriverName,
              status: printer.Status,
              comment: printer.Comment,
              location: printer.Location,
              type: 'windows_printer',
              method: 'windows_spooler',
              posProbability: this.calculatePOSProbability(printer),
              available: ['OK', 'Idle', 'Unknown', '', null].includes(printer.Status),
            });
          }
        }
      }
    } catch (error) {
      console.warn('Erreur récupération imprimantes Windows:', error.message);
    }

    try {
      const { stdout: portsResult } = await execAsync(
        'powershell "Get-WmiObject -Class Win32_SerialPort | Select-Object DeviceID, Description, Name | ConvertTo-Json"'
      );
      if (portsResult.trim()) {
        const portsData = JSON.parse(portsResult);
        const serialPorts = Array.isArray(portsData) ? portsData : [portsData];
        for (const port of serialPorts) {
          if (port.DeviceID) {
            printers.push({
              name: `Port série ${port.DeviceID}`,
              portName: port.DeviceID,
              description: port.Description || port.Name,
              type: 'serial_port',
              method: 'direct_serial',
              posProbability: this.calculateSerialPOSProbability(port),
              available: true,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Erreur récupération ports série:', error.message);
    }

    return printers.sort((a, b) => (b.posProbability || 0) - (a.posProbability || 0));
  }

  calculatePOSProbability(printer) {
    let score = 20;
    const text = [printer.Name, printer.DriverName, printer.Comment, printer.Location]
      .join(' ')
      .toLowerCase();

    if (/epson.*tm|star.*tsp|citizen.*ct|bixolon.*srp|custom.*kp|sewoo.*lk|pos.*printer/.test(text))
      score += 70;
    if (/thermal|receipt|ticket|pos|caisse/.test(text)) score += 50;
    if (/80mm|58mm/.test(text)) score += 40;
    if (/usb|serial/.test(text)) score += 20;
    if (/tm-t20|tm-t82|tm-t88|tsp100|tsp650|ct-s310|srp-350|kp-200/.test(text)) score += 60;
    if (/laser|inkjet|pdf|xps|fax|scan/.test(text)) score -= 40;
    if (/microsoft|generic/.test(text)) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  calculateSerialPOSProbability(port) {
    let score = 10;
    const text = (port.Description + ' ' + port.Name).toLowerCase();

    if (/prolific|ftdi|ch340/.test(text)) score += 30;
    if (/usb.*serial|serial.*port/.test(text)) score += 20;

    return Math.max(0, Math.min(50, score));
  }

  async connectToPrinter(printerName, config = {}) {
    const finalConfig = { ...this.printerConfig, ...config };
    const printers = await this.listAvailablePrinters();
    const targetPrinter = printers.find((p) => p.name === printerName);

    if (!targetPrinter) throw new Error(`Imprimante "${printerName}" non trouvée`);
    if (!targetPrinter.available)
      throw new Error(
        `Imprimante "${printerName}" non disponible (Status: ${targetPrinter.status})`
      );

    this.connectedPrinter = {
      name: printerName,
      type: targetPrinter.type,
      method: targetPrinter.method || 'windows_spooler', // ← sécurise ici
      portName: targetPrinter.portName,
      path: targetPrinter.portName,
      config: finalConfig,
      connected: true,
      printerInfo: targetPrinter,
    };

    await this.testConnection();

    return {
      success: true,
      message: `Imprimante "${printerName}" connectée`,
      method: targetPrinter.method,
      config: finalConfig,
    };
  }

  async testConnection() {
    if (this.connectedPrinter.method === 'windows_spooler') {
      await this.printViaWindows('Test connexion POS');
    }
  }

  async printViaWindows(content) {
    const tmp = path.join(require('os').tmpdir(), `pos_${Date.now()}.txt`);
    fs.writeFileSync(tmp, content, 'utf8');

    try {
      const ps = [
        'powershell',
        '-NoProfile',
        '-Command',
        `"Get-Content -Raw -Encoding UTF8 '${tmp}' | Out-Printer -Name '${this.connectedPrinter.name}'"`,
      ].join(' ');
      await execAsync(ps);
      return { success: true, message: 'Impression envoyée' };
    } finally {
      fs.existsSync(tmp) && fs.unlinkSync(tmp);
    }
  }

  async printViaWindowsRaw(rawData) {
    const tempFile = path.join(require('os').tmpdir(), `pos_raw_${Date.now()}.prn`);
    fs.writeFileSync(tempFile, rawData, 'binary');

    try {
      const printCmd = `copy /B "${tempFile}" "${this.connectedPrinter.portName}"`;
      await execAsync(printCmd);
      return { success: true, message: 'Impression raw envoyée' };
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }

  formatText(text, maxLength = 48) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[€]/g, 'EUR')
      .replace(/[^\x20-\x7E]/g, '')
      .substring(0, maxLength);
  }

  async printText(text, options = {}) {
    const {
      align = 'left',
      bold = false,
      underline = false,
      doubleHeight = false,
      doubleWidth = false,
      feed = true,
    } = options;

    if (this.connectedPrinter.method === 'windows_spooler') {
      let content = '';
      if (bold) content += '**';
      content += this.formatText(text);
      if (bold) content += '**';
      if (feed) content += '\n';
      return await this.printViaWindows(content);
    } else {
      return await this.printTextDirect(text, options);
    }
  }

  async printTextDirect(text, options = {}) {
    const {
      align = 'left',
      bold = false,
      underline = false,
      doubleHeight = false,
      doubleWidth = false,
      feed = true,
    } = options;

    let command = '';
    if (align === 'center') command += this.escCommands.alignCenter;
    else if (align === 'right') command += this.escCommands.alignRight;
    else command += this.escCommands.alignLeft;

    if (bold) command += this.escCommands.bold;
    if (underline) command += '\x1B\x2D\x01';
    if (doubleHeight && doubleWidth) command += '\x1B\x21\x30';
    else if (doubleHeight) command += this.escCommands.doubleHeight;
    else if (doubleWidth) command += this.escCommands.doubleWidth;

    const maxLength = doubleWidth ? 24 : 48;
    command += this.formatText(text, maxLength);

    if (bold) command += this.escCommands.boldOff;
    if (underline) command += '\x1B\x2D\x00';
    if (doubleHeight || doubleWidth) command += this.escCommands.normal;

    if (feed) command += this.escCommands.feed;

    return await this.printViaWindowsRaw(command);
  }

  async printLine(leftText = '', rightText = '', separator = '.') {
    const totalWidth = 48;
    const left = this.formatText(leftText, 20);
    const right = this.formatText(rightText, 15);
    const separatorLength = totalWidth - left.length - right.length;
    const separators = separator.repeat(Math.max(1, separatorLength));

    return await this.printText(left + separators + right);
  }

  centerText(text, width = 48) {
    const len = text.length;
    if (len >= width) return text.substring(0, width);
    const padding = Math.floor((width - len) / 2);
    return ' '.repeat(padding) + text;
  }

  async cutPaper(fullCut = false) {
    if (this.connectedPrinter.method === 'windows_spooler') {
      return await this.printViaWindows('\n\n\n\n');
    } else {
      const command = fullCut ? this.escCommands.cutFull : this.escCommands.cut;
      return await this.printViaWindowsRaw(command);
    }
  }

  async feedPaper(lines = 3) {
    const content = '\n'.repeat(lines);
    if (this.connectedPrinter.method === 'windows_spooler') {
      return await this.printViaWindows(content);
    } else {
      return await this.printViaWindowsRaw(this.escCommands.feed.repeat(lines));
    }
  }

  async openCashDrawer() {
    if (this.connectedPrinter.method === 'windows_spooler') {
      throw new Error('Ouverture tiroir-caisse non supportée via Windows.');
    }
    return await this.printViaWindowsRaw(this.escCommands.openCashDrawer);
  }

  disconnect() {
    this.connectedPrinter = null;
  }

  getStatus() {
    return {
      connected: this.connectedPrinter?.connected || false,
      printer: this.connectedPrinter,
      config: this.printerConfig,
    };
  }

  async printReceipt(items, options = {}) {
    const {
      storeName = 'MAGASIN POS',
      storeAddress = '',
      cashierName = '',
      transactionId = '',
      paymentMethod = 'ESPECES',
    } = options;

    let receiptContent = '';
    receiptContent += this.centerText(storeName.toUpperCase()) + '\n';
    if (storeAddress) {
      receiptContent += this.centerText(storeAddress) + '\n';
    }
    receiptContent += '\n';

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR');

    receiptContent += `Date: ${dateStr}  Heure: ${timeStr}\n`;
    if (transactionId) receiptContent += `Transaction: ${transactionId}\n`;
    if (cashierName) receiptContent += `Caissier: ${cashierName}\n`;

    receiptContent += '\n';
    receiptContent += '='.repeat(48) + '\n';

    let total = 0;
    for (const item of items) {
      const name = this.formatText(item.name || 'Article', 25);
      const qty = item.quantity || 1;
      const price = parseFloat(item.price || 0);
      const lineTotal = qty * price;
      total += lineTotal;

      if (qty > 1) {
        receiptContent += `${name}\n`;
        receiptContent +=
          this.formatText(`  ${qty} x ${price.toFixed(2)}EUR`, 30) +
          this.formatText(`${lineTotal.toFixed(2)}EUR`, 18) +
          '\n';
      } else {
        receiptContent +=
          this.formatText(name, 30) + this.formatText(`${lineTotal.toFixed(2)}EUR`, 18) + '\n';
      }
    }

    receiptContent += '-'.repeat(48) + '\n';
    receiptContent +=
      this.formatText('TOTAL', 30) + this.formatText(`${total.toFixed(2)}EUR`, 18) + '\n';
    receiptContent += '='.repeat(48) + '\n';

    receiptContent += '\n';
    receiptContent += `Paiement: ${paymentMethod}\n`;

    receiptContent += '\n';
    receiptContent += this.centerText('Merci de votre visite !') + '\n';
    receiptContent += '\n\n\n';

    if (this.connectedPrinter?.method === 'windows_spooler') {
      await this.printViaWindows(receiptContent);
    } else {
      throw new Error("Méthode d'impression non supportée.");
    }

    return {
      success: true,
      message: 'Ticket imprimé',
      total: total.toFixed(2),
      itemCount: items.length,
    };
  }
}

module.exports = new POSPrinterService();

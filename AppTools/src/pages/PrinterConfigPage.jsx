// services/posPrinterService.js - Version nettoyée et optimisée
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
      printMethod: 'powershell_dotnet',
      fontSize: 10,
      fontBold: true,
      fontFamily: 'Courier New',
      marginLeft: 0,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
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

  // === GESTION DES IMPRIMANTES ===

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
              method: 'powershell_dotnet',
              posProbability: this.calculatePOSProbability(printer),
              available: ['OK', 'Idle', 'Unknown', '', null].includes(printer.Status),
            });
          }
        }
      }
    } catch (error) {
      console.warn('Erreur récupération imprimantes Windows:', error.message);
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
      method: 'powershell_dotnet',
      portName: targetPrinter.portName,
      path: targetPrinter.portName,
      config: finalConfig,
      connected: true,
      printerInfo: targetPrinter,
    };

    // Test de connexion simple
    await this.printText('Test connexion POS - ' + new Date().toLocaleString('fr-FR'));

    return {
      success: true,
      message: `Imprimante "${printerName}" connectée`,
      method: 'powershell_dotnet',
      config: finalConfig,
    };
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

  // === IMPRESSION MODERNE ===

  async printText(text, options = {}) {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    const {
      autoWrap = false,
      charsPerLine = null,
      paperWidth = 80,
      fontSize = 10,
      bold = true,
      fontFamily = 'Courier New',
      align = 'left',
      lineSpacing = 2,
    } = options;

    try {
      if (autoWrap) {
        // Méthode moderne avec retour à la ligne
        return await this.printTextWithWrapping(text, {
          fontSize,
          fontBold: bold,
          fontFamily,
          paperWidth,
          align,
          charsPerLine,
          lineSpacing,
        });
      } else {
        // Méthode simple (une seule ligne, sans wrap)
        return await this.printTextWithWrapping(text, {
          fontSize,
          fontBold: bold,
          fontFamily,
          align,
          charsPerLine: text.length + 10, // Éviter le wrap
          lineSpacing,
        });
      }
    } catch (error) {
      console.warn('PowerShell moderne échoué, utilisation du fallback:', error.message);
      return await this.printViaWindowsFallback(text, options);
    }
  }

  // Méthode pour découper le texte selon la largeur du papier
  wrapText(text, options = {}) {
    const {
      fontSize = 10,
      paperWidth = 80,
      marginLeft = 0,
      marginRight = 0,
      charsPerLine = null,
    } = options;

    // Si charsPerLine est spécifié, l'utiliser directement
    let calculatedCharsPerLine;
    if (charsPerLine && charsPerLine > 0) {
      calculatedCharsPerLine = charsPerLine;
      console.log(`Caractères par ligne FORCÉ: ${calculatedCharsPerLine}`);
    } else {
      // Calcul automatique selon la largeur du papier
      if (paperWidth <= 30) {
        calculatedCharsPerLine = 20; // Très petit papier
      } else if (paperWidth <= 58) {
        calculatedCharsPerLine = 32; // 58mm
      } else if (paperWidth <= 80) {
        calculatedCharsPerLine = 48; // 80mm standard
      } else {
        calculatedCharsPerLine = 64; // 110mm et plus
      }
      console.log(
        `Largeur papier: ${paperWidth}mm -> ${calculatedCharsPerLine} caractères par ligne (auto)`
      );
    }

    const lines = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= calculatedCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Mot trop long, on le coupe
          let longWord = word;
          while (longWord.length > calculatedCharsPerLine) {
            lines.push(longWord.substring(0, calculatedCharsPerLine));
            longWord = longWord.substring(calculatedCharsPerLine);
          }
          if (longWord.length > 0) {
            currentLine = longWord;
          }
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    console.log(
      `Texte découpé en ${lines.length} lignes avec ${calculatedCharsPerLine} chars/ligne:`,
      lines
    );
    return lines;
  }

  // Méthode pour impression avec gestion automatique de la largeur
  async printTextWithWrapping(text, options = {}) {
    const {
      fontSize = 10,
      fontBold = true,
      fontFamily = 'Courier New',
      paperWidth = 80,
      align = 'left',
      lineSpacing = 2,
      charsPerLine = null,
    } = options;

    const lines = this.wrapText(text, {
      fontSize,
      paperWidth,
      charsPerLine,
    });

    const tempDir = require('os').tmpdir();
    const scriptFile = path.join(tempDir, `print_wrapped_${Date.now()}.ps1`);
    const fontStyle = fontBold ? 'Bold' : 'Regular';

    // Encoder correctement les caractères UTF-8
    const encodedLines = lines.map((line) => {
      return line
        .replace(/"/g, '""') // Échapper les guillemets
        .replace(/è/g, 'e') // Remplacer les accents problématiques
        .replace(/é/g, 'e')
        .replace(/à/g, 'a')
        .replace(/ù/g, 'u')
        .replace(/ç/g, 'c')
        .replace(/ê/g, 'e')
        .replace(/ô/g, 'o')
        .replace(/î/g, 'i')
        .replace(/â/g, 'a');
    });

    const linesArray = encodedLines.map((line) => `"${line}"`).join(', ');

    const powershellScript = `
# Forcer l'encodage UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$lignes = @(${linesArray})
$nomImprimante = "${this.connectedPrinter.name}"

Write-Host "=== IMPRESSION MODERNE ==="
Write-Host "Largeur papier: ${paperWidth}mm"
Write-Host "Caractères par ligne: ${charsPerLine || 'auto'}"
Write-Host "Nombre de lignes: $($lignes.Count)"

try {
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $nomImprimante
    
    if (-not $printDoc.PrinterSettings.IsValid) {
        throw "Imprimante '$nomImprimante' invalide"
    }
    
    # Définir une largeur de papier personnalisée
    $customWidth = ${paperWidth <= 30 ? 150 : paperWidth <= 58 ? 200 : paperWidth <= 80 ? 280 : 380}
    Write-Host "Largeur personnalisée: $customWidth pixels"
    
    $customPaperSize = New-Object System.Drawing.Printing.PaperSize("Custom", $customWidth, 1000)
    $printDoc.DefaultPageSettings.PaperSize = $customPaperSize
    $printDoc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
    
    $printDoc.Add_PrintPage({
        param($sender, $e)
        
        $font = New-Object System.Drawing.Font("${fontFamily}", ${fontSize}, [System.Drawing.FontStyle]::${fontStyle})
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
        
        $yPosition = 0
        $lineHeight = $font.Height + ${lineSpacing}
        
        foreach ($ligne in $lignes) {
            $textSize = $e.Graphics.MeasureString($ligne, $font)
            $posX = 0
            
            if ("${align}" -eq "center") {
                $posX = [Math]::Max(0, ($customWidth - $textSize.Width) / 2)
            } elseif ("${align}" -eq "right") {
                $posX = [Math]::Max(0, $customWidth - $textSize.Width)
            }
            
            $e.Graphics.DrawString($ligne, $font, $brush, $posX, $yPosition)
            $yPosition += $lineHeight
        }
        
        $font.Dispose()
        $brush.Dispose()
        Write-Host "Toutes les lignes imprimées"
    })
    
    $printDoc.Print()
    Write-Host "SUCCESS: ${lines.length} lignes imprimées"
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
} finally {
    if ($printDoc) { $printDoc.Dispose() }
}
`;

    fs.writeFileSync(scriptFile, powershellScript, 'utf8');

    try {
      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}"`,
        { encoding: 'utf8', timeout: 30000 }
      );

      console.log('=== PowerShell Output ===');
      console.log(stdout);

      if (stdout.includes('ERROR:')) {
        const errorMsg = stdout.split('ERROR: ')[1]?.split('\n')[0] || 'Erreur inconnue';
        throw new Error(errorMsg);
      }

      return {
        success: true,
        message: `${lines.length} ligne(s) imprimée(s) avec retour automatique`,
        linesCount: lines.length,
        paperWidth: paperWidth,
        charsPerLine: charsPerLine || 'auto',
      };
    } finally {
      if (fs.existsSync(scriptFile)) {
        fs.unlinkSync(scriptFile);
      }
    }
  }

  // === MÉTHODE DE FALLBACK POUR COMPATIBILITÉ ===

  async printViaWindowsFallback(text, options = {}) {
    const { charsPerLine = 48, autoWrap = false } = options;

    let finalText = text;

    // Appliquer le word wrap manuellement si nécessaire
    if (autoWrap && charsPerLine) {
      const lines = this.wrapText(text, { charsPerLine });
      finalText = lines.join('\n');
    }

    // Nettoyer les accents pour la méthode fallback
    finalText = finalText
      .replace(/è/g, 'e')
      .replace(/é/g, 'e')
      .replace(/à/g, 'a')
      .replace(/ù/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/ê/g, 'e')
      .replace(/ô/g, 'o')
      .replace(/î/g, 'i')
      .replace(/â/g, 'a');

    const tmp = path.join(require('os').tmpdir(), `pos_fallback_${Date.now()}.txt`);
    fs.writeFileSync(tmp, finalText, 'utf8');

    try {
      const ps = [
        'powershell',
        '-NoProfile',
        '-Command',
        `"Get-Content -Raw -Encoding UTF8 '${tmp}' | Out-Printer -Name '${this.connectedPrinter.name}'"`,
      ].join(' ');
      await execAsync(ps);

      return {
        success: true,
        message: 'Impression envoyée (méthode fallback)',
        method: 'windows_fallback',
      };
    } finally {
      fs.existsSync(tmp) && fs.unlinkSync(tmp);
    }
  }

  // === UTILITAIRES DE FORMATAGE ===

  formatText(text, maxLength = 42) {
    if (!text) return '';

    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les diacritiques
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/[€]/g, 'EUR')
      .replace(/[£]/g, 'GBP')
      .replace(/[¥]/g, 'YEN')
      .replace(/[^\x20-\x7E]/g, '') // Garder seulement ASCII imprimable
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
      .substring(0, Math.max(1, maxLength));
  }

  centerText(text, width = 42) {
    if (!text) return '';

    // Nettoyer le texte d'abord
    const cleanText = this.formatText(text, width);
    const len = cleanText.length;

    if (len >= width) return cleanText;

    const padding = Math.floor((width - len) / 2);
    const leftPadding = ' '.repeat(Math.max(0, padding));
    const result = leftPadding + cleanText;

    // S'assurer qu'on ne dépasse pas la largeur
    return result.substring(0, width);
  }

  // === IMPRESSION AVANCÉE (OPTIONNEL) ===

  async printLine(leftText = '', rightText = '', separator = '.') {
    const totalWidth = 48;
    const left = this.formatText(leftText, 20);
    const right = this.formatText(rightText, 15);
    const separatorLength = totalWidth - left.length - right.length;
    const separators = separator.repeat(Math.max(1, separatorLength));

    return await this.printText(left + separators + right);
  }

  async printReceipt(items, options = {}) {
    const {
      storeName = 'MAGASIN POS',
      storeAddress = '',
      cashierName = '',
      transactionId = '',
      paymentMethod = 'ESPECES',
      fontSize = 10,
      fontBold = true,
      paperWidth = 80,
    } = options;

    // Calculer la largeur en caractères selon le papier
    let maxWidth;
    if (paperWidth <= 58) {
      maxWidth = 32;
    } else if (paperWidth <= 80) {
      maxWidth = 42; // Réduit pour éviter les débordements
    } else {
      maxWidth = 56;
    }

    const receiptLines = [];

    // En-tête centré
    receiptLines.push(this.centerText(storeName.toUpperCase(), maxWidth));
    if (storeAddress) {
      receiptLines.push(this.centerText(storeAddress, maxWidth));
    }
    receiptLines.push('');

    // Informations transaction - FORMAT SÉCURISÉ
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    receiptLines.push(`Date: ${dateStr}`);
    receiptLines.push(`Heure: ${timeStr}`);

    if (transactionId) {
      // Nettoyer l'ID de transaction
      const cleanId = String(transactionId)
        .replace(/[^\w-]/g, '')
        .substring(0, 20);
      receiptLines.push(`Transaction: ${cleanId}`);
    }

    if (cashierName) {
      const cleanCashier = this.formatText(cashierName, 20);
      receiptLines.push(`Caissier: ${cleanCashier}`);
    }

    receiptLines.push('');
    receiptLines.push('='.repeat(maxWidth));

    // Articles avec formatage sécurisé
    let total = 0;
    for (const item of items) {
      const name = this.formatText(item.name || 'Article', Math.floor(maxWidth * 0.6));
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const price = Math.max(0, parseFloat(item.price) || 0);
      const lineTotal = qty * price;
      total += lineTotal;

      if (qty > 1) {
        // Article sur 2 lignes pour plus de clarté
        receiptLines.push(name);
        const qtyPrice = `${qty} x ${price.toFixed(2)}`;
        const totalPrice = `${lineTotal.toFixed(2)}`;
        const spacesNeeded = maxWidth - qtyPrice.length - totalPrice.length - 3;
        receiptLines.push(`  ${qtyPrice}${' '.repeat(Math.max(1, spacesNeeded))}${totalPrice}`);
      } else {
        // Article sur 1 ligne
        const priceText = `${lineTotal.toFixed(2)}`;
        const spacesNeeded = maxWidth - name.length - priceText.length;
        receiptLines.push(`${name}${' '.repeat(Math.max(1, spacesNeeded))}${priceText}`);
      }
    }

    // Séparateur et total
    receiptLines.push('-'.repeat(maxWidth));
    const totalText = 'TOTAL';
    const totalAmount = `${total.toFixed(2)} EUR`;
    const spacesTotal = maxWidth - totalText.length - totalAmount.length;
    receiptLines.push(`${totalText}${' '.repeat(Math.max(1, spacesTotal))}${totalAmount}`);
    receiptLines.push('='.repeat(maxWidth));

    // Pied de page
    receiptLines.push('');
    receiptLines.push(`Paiement: ${this.formatText(paymentMethod, 20)}`);
    receiptLines.push('');
    receiptLines.push(this.centerText('Merci de votre visite !', maxWidth));
    receiptLines.push('');
    receiptLines.push('');

    // Imprimer tout le ticket en une fois avec options précises
    const fullReceipt = receiptLines.join('\n');
    await this.printText(fullReceipt, {
      autoWrap: false, // Pas de wrap automatique, on gère manuellement
      fontSize,
      bold: fontBold,
      paperWidth,
      charsPerLine: maxWidth + 5, // Marge de sécurité
    });

    return {
      success: true,
      message: 'Ticket imprimé',
      total: total.toFixed(2),
      itemCount: items.length,
    };
  }

  // === CONTRÔLES PAPIER (OPTIONNEL) ===

  async cutPaper(fullCut = false) {
    // Simuler la coupe avec des sauts de ligne
    return await this.printText('\n\n\n\n');
  }

  async feedPaper(lines = 3) {
    const content = '\n'.repeat(lines);
    return await this.printText(content);
  }

  async openCashDrawer() {
    throw new Error('Ouverture tiroir-caisse non supportée via PowerShell .NET');
  }

  // === TEST DE COMPATIBILITÉ ===

  async testPowerShellCapabilities() {
    try {
      const testScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Write-Output "PowerShell .NET OK"
`;

      const tempFile = path.join(require('os').tmpdir(), 'test_ps.ps1');
      fs.writeFileSync(tempFile, testScript, 'utf8');

      const { stdout } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
        { timeout: 10000 }
      );

      fs.unlinkSync(tempFile);

      return {
        powerShellDotNet: stdout.includes('PowerShell .NET OK'),
        version: 'modern',
        capabilities: ['advanced_printing', 'font_control', 'margin_control'],
      };
    } catch (error) {
      return {
        powerShellDotNet: false,
        version: 'legacy',
        capabilities: ['basic_printing'],
        error: error.message,
      };
    }
  }
}

module.exports = new POSPrinterService();

// services/posPrinterService.js - Version optimisée avec correction alignement
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

  // === CALCUL DE LA LARGEUR EFFECTIVE ===

  calculateEffectiveWidth(options = {}) {
    const { paperWidth = 80, charsPerLine = null, fontSize = 10 } = options;

    // PRIORITÉ 1 : charsPerLine explicite
    if (charsPerLine && charsPerLine > 0) {
      console.log(`Largeur FORCÉE: ${charsPerLine} caractères`);
      return charsPerLine;
    }

    // PRIORITÉ 2 : Calcul automatique selon paperWidth ET fontSize
    let baseWidth;

    // Calcul de base selon la largeur physique
    if (paperWidth <= 30) {
      baseWidth = 20;
    } else if (paperWidth <= 58) {
      baseWidth = 32;
    } else if (paperWidth <= 80) {
      baseWidth = 48;
    } else {
      baseWidth = 64;
    }

    // CORRECTION SELON LA TAILLE DE POLICE
    // Plus la police est grande, moins on peut mettre de caractères
    let fontMultiplier = 1.0;

    if (fontSize <= 8) {
      fontMultiplier = 1.2; // Police petite = plus de caractères
    } else if (fontSize === 9) {
      fontMultiplier = 1.1;
    } else if (fontSize === 10) {
      fontMultiplier = 1.0; // Taille standard
    } else if (fontSize === 11) {
      fontMultiplier = 0.9;
    } else if (fontSize >= 12) {
      fontMultiplier = 0.8; // Police grande = moins de caractères
    }

    const calculatedWidth = Math.floor(baseWidth * fontMultiplier);

    console.log(`╔════════════════════════════════════════╗`);
    console.log(`║ CALCUL LARGEUR EFFECTIVE               ║`);
    console.log(`╠════════════════════════════════════════╣`);
    console.log(`║ Papier: ${paperWidth}mm → Base: ${baseWidth} chars   ║`);
    console.log(`║ Police: ${fontSize}pt → Multiplicateur: ${fontMultiplier}  ║`);
    console.log(`║ RÉSULTAT: ${calculatedWidth} caractères/ligne    ║`);
    console.log(`╚════════════════════════════════════════╝`);

    return calculatedWidth;
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
        return await this.printTextWithWrapping(text, {
          fontSize,
          fontBold: bold,
          fontFamily,
          align,
          charsPerLine: text.length + 10,
          lineSpacing,
        });
      }
    } catch (error) {
      console.warn('PowerShell moderne échoué, utilisation du fallback:', error.message);
      return await this.printViaWindowsFallback(text, options);
    }
  }

  wrapText(text, options = {}) {
    const effectiveWidth = this.calculateEffectiveWidth(options);
    const lines = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= effectiveWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          let longWord = word;
          while (longWord.length > effectiveWidth) {
            lines.push(longWord.substring(0, effectiveWidth));
            longWord = longWord.substring(effectiveWidth);
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

    console.log(`Texte découpé en ${lines.length} lignes avec ${effectiveWidth} chars/ligne`);
    return lines;
  }

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

    const lines = this.wrapText(text, { fontSize, paperWidth, charsPerLine });

    const tempDir = require('os').tmpdir();
    const scriptFile = path.join(tempDir, `print_wrapped_${Date.now()}.ps1`);
    const fontStyle = fontBold ? 'Bold' : 'Regular';

    const encodedLines = lines.map((line) => {
      return line
        .replace(/"/g, '""')
        .replace(/è/g, 'e')
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
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$lignes = @(${linesArray})
$nomImprimante = "${this.connectedPrinter.name}"

Write-Host "=== IMPRESSION ==="
Write-Host "Lignes: $($lignes.Count)"

try {
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $nomImprimante
    
    if (-not $printDoc.PrinterSettings.IsValid) {
        throw "Imprimante invalide"
    }
    
    $customWidth = ${paperWidth <= 30 ? 150 : paperWidth <= 58 ? 200 : paperWidth <= 80 ? 280 : 380}
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
    })
    
    $printDoc.Print()
    Write-Host "SUCCESS"
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
} finally {
    if ($printDoc) { $printDoc.Dispose() }
}
`;

    fs.writeFileSync(scriptFile, powershellScript, 'utf8');

    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}"`,
        { encoding: 'utf8', timeout: 30000 }
      );

      if (stdout.includes('ERROR:')) {
        const errorMsg = stdout.split('ERROR: ')[1]?.split('\n')[0] || 'Erreur inconnue';
        throw new Error(errorMsg);
      }

      return {
        success: true,
        message: `${lines.length} ligne(s) imprimée(s)`,
        linesCount: lines.length,
      };
    } finally {
      if (fs.existsSync(scriptFile)) {
        fs.unlinkSync(scriptFile);
      }
    }
  }

  async printViaWindowsFallback(text, options = {}) {
    const { charsPerLine = 48, autoWrap = false } = options;

    let finalText = text;

    if (autoWrap && charsPerLine) {
      const lines = this.wrapText(text, { charsPerLine });
      finalText = lines.join('\n');
    }

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
        message: 'Impression envoyée (fallback)',
        method: 'windows_fallback',
      };
    } finally {
      fs.existsSync(tmp) && fs.unlinkSync(tmp);
    }
  }

  // === UTILITAIRES DE FORMATAGE ===

  formatText(text, maxLength = 48) {
    if (!text) return '';

    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, Math.max(1, maxLength));
  }

  // === IMPRESSION TICKET OPTIMISÉE ===

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
      charsPerLine = null,
    } = options;

    // Calculer la largeur effective avec la taille de police
    const effectiveWidth = this.calculateEffectiveWidth({ paperWidth, charsPerLine, fontSize });

    console.log(`=== IMPRESSION TICKET ===`);
    console.log(`Paramètres: ${paperWidth}mm, Police ${fontSize}pt`);
    console.log(`Largeur effective: ${effectiveWidth} caractères`);

    const receiptLines = [];

    // En-tête
    receiptLines.push(this.formatText(storeName.toUpperCase(), effectiveWidth));
    if (storeAddress) {
      receiptLines.push(this.formatText(storeAddress, effectiveWidth));
    }
    receiptLines.push('');

    // Informations transaction
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR');

    receiptLines.push(`Date: ${dateStr}`.substring(0, effectiveWidth));
    receiptLines.push(`Heure: ${timeStr}`.substring(0, effectiveWidth));

    if (transactionId) {
      const cleanId = String(transactionId)
        .replace(/[^\w-]/g, '')
        .substring(0, effectiveWidth - 14);
      receiptLines.push(`Transaction: ${cleanId}`.substring(0, effectiveWidth));
    }

    if (cashierName) {
      const cleanCashier = this.formatText(cashierName, effectiveWidth - 10);
      receiptLines.push(`Caissier: ${cleanCashier}`.substring(0, effectiveWidth));
    }

    receiptLines.push('');
    receiptLines.push('='.repeat(effectiveWidth));

    // Articles - CALCUL PRÉCIS DE L'ALIGNEMENT
    let total = 0;
    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      const price = Math.max(0, parseFloat(item.price) || 0);
      const lineTotal = qty * price;
      total += lineTotal;

      // Format du prix (toujours XX.XX)
      const priceText = lineTotal.toFixed(2);

      // Espace réservé pour le prix (toujours à droite)
      const priceSpace = priceText.length;

      // Espace disponible pour le nom (CRITICAL: -1 pour l'espace séparateur)
      const maxNameLength = effectiveWidth - priceSpace - 1;

      const name = this.formatText(item.name || 'Article', maxNameLength);

      // Construction de la ligne avec espaces calculés PRÉCISÉMENT
      const spacesNeeded = effectiveWidth - name.length - priceText.length;
      const line = `${name}${' '.repeat(Math.max(1, spacesNeeded))}${priceText}`;

      // VÉRIFICATION: la ligne ne doit JAMAIS dépasser effectiveWidth
      const finalLine = line.substring(0, effectiveWidth);
      receiptLines.push(finalLine);

      console.log(
        `Article: "${name}" (${name.length}) + ${spacesNeeded} espaces + "${priceText}" (${priceText.length}) = ${finalLine.length} chars`
      );

      // Détail quantité si > 1
      if (qty > 1) {
        const detailLine = `  ${qty} x ${price.toFixed(2)}`;
        receiptLines.push(detailLine.substring(0, effectiveWidth));
      }
    }

    // Séparateur et total
    receiptLines.push('-'.repeat(effectiveWidth));

    const totalLabel = 'TOTAL';
    const totalAmount = total.toFixed(2);
    const spacesTotal = effectiveWidth - totalLabel.length - totalAmount.length;
    const totalLine = `${totalLabel}${' '.repeat(Math.max(1, spacesTotal))}${totalAmount}`;
    const finalTotalLine = totalLine.substring(0, effectiveWidth);

    receiptLines.push(finalTotalLine);
    console.log(
      `Total: "${totalLabel}" + ${spacesTotal} espaces + "${totalAmount}" = ${finalTotalLine.length} chars`
    );

    receiptLines.push('='.repeat(effectiveWidth));

    // Pied de page
    receiptLines.push('');
    receiptLines.push(
      `Paiement: ${this.formatText(paymentMethod, effectiveWidth - 10)}`.substring(
        0,
        effectiveWidth
      )
    );
    receiptLines.push('');
    receiptLines.push('Merci de votre visite !'.substring(0, effectiveWidth));
    receiptLines.push('');

    // Imprimer tout le ticket
    const fullReceipt = receiptLines.join('\n');

    await this.printText(fullReceipt, {
      autoWrap: false,
      fontSize,
      bold: fontBold,
      paperWidth,
      align: 'left',
      charsPerLine: effectiveWidth,
    });

    return {
      success: true,
      message: 'Ticket imprimé',
      total: total.toFixed(2),
      itemCount: items.length,
      effectiveWidth,
    };
  }

  // === AUTRES MÉTHODES ===

  async printLine(leftText = '', rightText = '', separator = '.') {
    const effectiveWidth = this.calculateEffectiveWidth({ paperWidth: 80 });
    const left = this.formatText(leftText, Math.floor(effectiveWidth * 0.4));
    const right = this.formatText(rightText, Math.floor(effectiveWidth * 0.3));
    const separatorLength = effectiveWidth - left.length - right.length;
    const separators = separator.repeat(Math.max(1, separatorLength));

    return await this.printText(left + separators + right);
  }

  async cutPaper(fullCut = false) {
    return await this.printText('\n\n\n\n');
  }

  async feedPaper(lines = 3) {
    const content = '\n'.repeat(lines);
    return await this.printText(content);
  }

  async openCashDrawer() {
    throw new Error('Ouverture tiroir-caisse non supportée via PowerShell .NET');
  }

  async printBarcode(data, type = 'CODE128') {
    throw new Error('Impression code-barres non supportée via PowerShell .NET');
  }

  async testPrinter() {
    await this.printText('=== TEST IMPRIMANTE POS ===', { bold: true });
    await this.printText('');
    await this.printText('Test impression simple');
    await this.printLine('Article test', '12.50 EUR');
    await this.feedPaper(2);

    return {
      success: true,
      message: 'Test imprimante terminé',
    };
  }

  // === CALIBRATION AUTOMATIQUE ===

  async calibratePrinter(paperWidth = 80, fontSize = 10) {
    console.log(`\n╔════════════════════════════════════════════════╗`);
    console.log(`║  CALIBRATION IMPRIMANTE                        ║`);
    console.log(`╠════════════════════════════════════════════════╣`);
    console.log(`║  Papier: ${paperWidth}mm | Police: ${fontSize}pt                ║`);
    console.log(`╚════════════════════════════════════════════════╝\n`);

    // Test de différentes largeurs - SANS FORCER charsPerLine pour voir les débordements
    const testWidths = [20, 25, 30, 35, 40, 45, 50, 55, 60];

    for (const testWidth of testWidths) {
      // Créer une ligne de la longueur exacte demandée
      const line = `${testWidth}: ${'='.repeat(testWidth - 4)}`;

      console.log(`Test ${testWidth} chars: "${line}" (longueur: ${line.length})`);

      // NE PAS forcer charsPerLine - laisser déborder naturellement
      await this.printText(line, {
        fontSize,
        paperWidth,
        bold: false,
        align: 'left',
        autoWrap: false, // Important: pas de wrap automatique
      });
    }

    await this.feedPaper(4);

    return {
      success: true,
      message: 'Test de calibration imprimé',
      instructions: 'La ligne parfaite reste sur une seule ligne sans déborder',
      testedWidths: testWidths,
    };
  }

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

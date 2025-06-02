// services/posPrinterService.js - Version améliorée avec PowerShell .NET
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
      // Nouveaux paramètres pour le contrôle précis
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

  // Méthode PowerShell .NET pour impression avec contrôle total
  async printViaPowerShellDotNet(content, options = {}) {
    const {
      fontSize = this.printerConfig.fontSize,
      fontBold = this.printerConfig.fontBold,
      fontFamily = this.printerConfig.fontFamily,
      marginLeft = this.printerConfig.marginLeft,
      marginTop = this.printerConfig.marginTop,
      marginRight = this.printerConfig.marginRight,
      marginBottom = this.printerConfig.marginBottom,
      align = 'left',
    } = options;

    // Créer un fichier PowerShell temporaire pour éviter les problèmes d'échappement
    const tempDir = require('os').tmpdir();
    const scriptFile = path.join(tempDir, `print_script_${Date.now()}.ps1`);

    const fontStyle = fontBold ? 'Bold' : 'Regular';

    // Position X basée sur l'alignement
    let positionXLogic = marginLeft;
    if (align === 'center') {
      positionXLogic = `[Math]::Max(0, ($e.PageBounds.Width - $textSize.Width) / 2)`;
    } else if (align === 'right') {
      positionXLogic = `[Math]::Max(0, $e.PageBounds.Width - $textSize.Width - ${marginRight})`;
    }

    const powershellScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$texte = @"
${content}
"@

$nomImprimante = "${this.connectedPrinter.name}"

Write-Host "Tentative d'impression sur: $nomImprimante"
Write-Host "Texte à imprimer: $texte"

try {
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $nomImprimante
    
    # Vérifier que l'imprimante existe
    if (-not $printDoc.PrinterSettings.IsValid) {
        throw "Imprimante '$nomImprimante' non trouvée ou invalide"
    }
    
    Write-Host "Imprimante validée: $($printDoc.PrinterSettings.PrinterName)"
    
    # Définir les marges précises
    $margins = New-Object System.Drawing.Printing.Margins(${marginLeft}, ${marginRight}, ${marginTop}, ${marginBottom})
    $printDoc.DefaultPageSettings.Margins = $margins
    
    $printDoc.Add_PrintPage({
        param($sender, $e)
        
        Write-Host "Début de l'impression..."
        
        # Créer la police avec les paramètres spécifiés
        $font = New-Object System.Drawing.Font("${fontFamily}", ${fontSize}, [System.Drawing.FontStyle]::${fontStyle})
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
        
        # Calculer la taille du texte pour l'alignement
        $textSize = $e.Graphics.MeasureString($texte, $font)
        
        # Calculer la position X selon l'alignement
        $posX = ${positionXLogic}
        $posY = ${marginTop}
        
        Write-Host "Position: X=$posX, Y=$posY"
        
        # Dessiner le texte
        $e.Graphics.DrawString($texte, $font, $brush, $posX, $posY)
        
        Write-Host "Texte dessiné avec succès"
        
        # Nettoyer les ressources
        $font.Dispose()
        $brush.Dispose()
    })
    
    Write-Host "Envoi à l'imprimante..."
    $printDoc.Print()
    Write-Host "SUCCESS: Impression envoyée avec succès"
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "StackTrace: $($_.Exception.StackTrace)"
} finally {
    if ($printDoc) {
        $printDoc.Dispose()
    }
}
`;

    // Écrire le script dans un fichier temporaire
    fs.writeFileSync(scriptFile, powershellScript, 'utf8');

    try {
      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}"`,
        { encoding: 'utf8', timeout: 30000 }
      );

      console.log('PowerShell stdout:', stdout);
      console.log('PowerShell stderr:', stderr);

      if (stderr && !stderr.includes('Warning')) {
        throw new Error(`PowerShell Error: ${stderr}`);
      }

      if (stdout.includes('ERROR:')) {
        const errorMsg = stdout.split('ERROR: ')[1]?.split('\n')[0] || 'Erreur inconnue';
        throw new Error(errorMsg);
      }

      if (!stdout.includes('SUCCESS:')) {
        throw new Error('Impression échouée - aucun message de succès reçu');
      }

      return {
        success: true,
        message: 'Impression envoyée via PowerShell .NET',
        method: 'powershell_dotnet',
        debug: stdout,
      };
    } catch (error) {
      throw new Error(`Erreur PowerShell: ${error.message}`);
    } finally {
      // Nettoyer le fichier temporaire
      if (fs.existsSync(scriptFile)) {
        fs.unlinkSync(scriptFile);
      }
    }
  }

  // Version simplifiée pour impression rapide
  async printTextPowerShell(text, options = {}) {
    if (!this.connectedPrinter) {
      throw new Error('Aucune imprimante connectée');
    }

    const { fontSize = 10, fontBold = true, align = 'left' } = options;

    return await this.printViaPowerShellDotNet(text, {
      fontSize,
      fontBold,
      align,
      marginLeft: 0,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
    });
  }

  // Version simplifiée pour débugger
  async printTextSimple(text) {
    const tempDir = require('os').tmpdir();
    const scriptFile = path.join(tempDir, `simple_print_${Date.now()}.ps1`);

    const simpleScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Write-Host "=== DEBUT TEST IMPRESSION ==="
Write-Host "Imprimante cible: ${this.connectedPrinter.name}"
Write-Host "Texte: ${text}"

# Lister les imprimantes disponibles
Write-Host "Imprimantes disponibles:"
Get-Printer | ForEach-Object { Write-Host "- $($_.Name)" }

try {
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = "${this.connectedPrinter.name}"
    
    Write-Host "PrinterSettings.IsValid: $($printDoc.PrinterSettings.IsValid)"
    
    if (-not $printDoc.PrinterSettings.IsValid) {
        Write-Host "ERROR: Imprimante invalide"
        exit 1
    }
    
    $printDoc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
    
    $printDoc.Add_PrintPage({
        param($sender, $e)
        Write-Host "Dans Add_PrintPage..."
        $font = New-Object System.Drawing.Font("Courier New", 10, [System.Drawing.FontStyle]::Bold)
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
        $e.Graphics.DrawString("${text}", $font, $brush, 0, 0)
        Write-Host "DrawString exécuté"
        $font.Dispose()
        $brush.Dispose()
    })
    
    Write-Host "Appel Print()..."
    $printDoc.Print()
    Write-Host "SUCCESS: Print() terminé"
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    Write-Host "StackTrace: $($_.Exception.StackTrace)"
} finally {
    if ($printDoc) { $printDoc.Dispose() }
}

Write-Host "=== FIN TEST IMPRESSION ==="
`;

    fs.writeFileSync(scriptFile, simpleScript, 'utf8');

    try {
      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptFile}"`,
        { encoding: 'utf8', timeout: 30000 }
      );

      console.log('=== PowerShell Output ===');
      console.log(stdout);
      if (stderr) console.log('=== PowerShell Errors ===');
      if (stderr) console.log(stderr);

      return {
        success: true,
        message: 'Test simple exécuté',
        output: stdout,
        errors: stderr,
      };
    } finally {
      if (fs.existsSync(scriptFile)) {
        fs.unlinkSync(scriptFile);
      }
    }
  }

  // Méthode pour impression multi-lignes avec formatage
  async printFormattedText(lines, options = {}) {
    if (!Array.isArray(lines)) {
      lines = [lines];
    }

    const { fontSize = 10, fontBold = true, fontFamily = 'Courier New', lineSpacing = 2 } = options;

    const escapedLines = lines.map((line) => String(line).replace(/"/g, '""').replace(/\$/g, '`$'));

    const powershellScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$lignes = @(${escapedLines.map((line) => `"${line}"`).join(', ')})
$nomImprimante = "${this.connectedPrinter.name}"

$printDoc = New-Object System.Drawing.Printing.PrintDocument
$printDoc.PrinterSettings.PrinterName = $nomImprimante
$printDoc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

$printDoc.Add_PrintPage({
    param($sender, $e)
    
    $font = New-Object System.Drawing.Font("${fontFamily}", ${fontSize}, [System.Drawing.FontStyle]::${fontBold ? 'Bold' : 'Regular'})
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    
    $yPosition = 0
    $lineHeight = $font.Height + ${lineSpacing}
    
    foreach ($ligne in $lignes) {
        $e.Graphics.DrawString($ligne, $font, $brush, 0, $yPosition)
        $yPosition += $lineHeight
    }
    
    $font.Dispose()
    $brush.Dispose()
})

try {
    $printDoc.Print()
    Write-Output "SUCCESS"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
} finally {
    $printDoc.Dispose()
}
`;

    try {
      const { stdout, stderr } = await execAsync(
        `powershell -NoProfile -Command "${powershellScript.replace(/"/g, '`"')}"`,
        { encoding: 'utf8' }
      );

      if (stderr || stdout.includes('ERROR:')) {
        throw new Error(stderr || stdout.replace('ERROR: ', ''));
      }

      return {
        success: true,
        message: `${lines.length} ligne(s) imprimée(s)`,
        method: 'powershell_dotnet_multiline',
      };
    } catch (error) {
      throw new Error(`Erreur impression multi-lignes: ${error.message}`);
    }
  }

  // Conserver les anciennes méthodes pour compatibilité
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
              method: 'powershell_dotnet', // Nouvelle méthode par défaut
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
      method: 'powershell_dotnet', // Utiliser la nouvelle méthode
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
      method: 'powershell_dotnet',
      config: finalConfig,
    };
  }

  async testConnection() {
    await this.printTextPowerShell('Test connexion POS - ' + new Date().toLocaleString('fr-FR'));
  }

  // Méthode pour découper le texte selon la largeur du papier
  wrapText(text, options = {}) {
    const {
      fontSize = 10,
      paperWidth = 80,
      marginLeft = 0,
      marginRight = 0,
      charsPerLine = null, // NOUVEAU : permet de forcer le nombre de caractères
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
      charsPerLine = null, // NOUVEAU : transmission du paramètre
    } = options;

    const lines = this.wrapText(text, {
      fontSize,
      paperWidth,
      charsPerLine, // Passer le paramètre à wrapText
    });

    const tempDir = require('os').tmpdir();
    const scriptFile = path.join(tempDir, `print_wrapped_${Date.now()}.ps1`);
    const fontStyle = fontBold ? 'Bold' : 'Regular';

    // CORRECTIF : Encoder correctement les caractères UTF-8
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

Write-Host "=== IMPRESSION AVEC RETOUR LIGNE ==="
Write-Host "Largeur papier: ${paperWidth}mm"
Write-Host "Caractères par ligne: ${charsPerLine || 'auto'}"
Write-Host "Nombre de lignes: $($lignes.Count)"

try {
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    $printDoc.PrinterSettings.PrinterName = $nomImprimante
    
    if (-not $printDoc.PrinterSettings.IsValid) {
        throw "Imprimante '$nomImprimante' invalide"
    }
    
    # CORRECTIF : Définir une largeur de papier personnalisée
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
            Write-Host "Impression ligne: $ligne"
            $e.Graphics.DrawString($ligne, $font, $brush, 0, $yPosition)
            $yPosition += $lineHeight
        }
        
        $font.Dispose()
        $brush.Dispose()
        Write-Host "Toutes les lignes imprimées avec largeur $customWidth"
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

      console.log('=== PowerShell Wrapping Output ===');
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

  // Nouvelle méthode printText qui utilise PowerShell .NET
  async printText(text, options = {}) {
    const {
      align = 'left',
      bold = true,
      fontSize = 10,
      fontFamily = 'Courier New',
      paperWidth = 80,
      autoWrap = false,
      charsPerLine = null, // NOUVEAU : paramètre pour forcer les caractères par ligne
    } = options;

    if (autoWrap) {
      return await this.printTextWithWrapping(text, {
        fontSize,
        fontBold: bold,
        fontFamily,
        paperWidth,
        align,
        charsPerLine, // Transmettre le paramètre
      });
    } else {
      return await this.printTextSimple(text);
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
      fontSize = 10,
      fontBold = true,
    } = options;

    const receiptLines = [];

    // En-tête
    receiptLines.push(this.centerText(storeName.toUpperCase()));
    if (storeAddress) {
      receiptLines.push(this.centerText(storeAddress));
    }
    receiptLines.push('');

    // Informations transaction
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR');

    receiptLines.push(`Date: ${dateStr}  Heure: ${timeStr}`);
    if (transactionId) receiptLines.push(`Transaction: ${transactionId}`);
    if (cashierName) receiptLines.push(`Caissier: ${cashierName}`);

    receiptLines.push('');
    receiptLines.push('='.repeat(48));

    // Articles
    let total = 0;
    for (const item of items) {
      const name = this.formatText(item.name || 'Article', 25);
      const qty = item.quantity || 1;
      const price = parseFloat(item.price || 0);
      const lineTotal = qty * price;
      total += lineTotal;

      if (qty > 1) {
        receiptLines.push(name);
        receiptLines.push(
          this.formatText(`  ${qty} x ${price.toFixed(2)}EUR`, 30) +
            this.formatText(`${lineTotal.toFixed(2)}EUR`, 18)
        );
      } else {
        receiptLines.push(
          this.formatText(name, 30) + this.formatText(`${lineTotal.toFixed(2)}EUR`, 18)
        );
      }
    }

    // Total
    receiptLines.push('-'.repeat(48));
    receiptLines.push(this.formatText('TOTAL', 30) + this.formatText(`${total.toFixed(2)}EUR`, 18));
    receiptLines.push('='.repeat(48));

    // Pied de page
    receiptLines.push('');
    receiptLines.push(`Paiement: ${paymentMethod}`);
    receiptLines.push('');
    receiptLines.push(this.centerText('Merci de votre visite !'));
    receiptLines.push('');
    receiptLines.push('');

    // Imprimer tout le ticket
    await this.printFormattedText(receiptLines, { fontSize, fontBold });

    return {
      success: true,
      message: 'Ticket imprimé',
      total: total.toFixed(2),
      itemCount: items.length,
    };
  }
}

module.exports = new POSPrinterService();

// ===== 3. SERVICE PRINCIPAL - services/labelPrintingService.js =====
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const os = require('os');

class LabelPrintingService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'label-printing');
    this.ensureTempDirectory();
  }

  /**
   * Créer le dossier temporaire si nécessaire
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log(`📁 [PRINT] Dossier temporaire: ${this.tempDir}`);
    } catch (error) {
      console.error('❌ [PRINT] Erreur création dossier temp:', error);
    }
  }

  /**
   * Impression principale des étiquettes
   */
  async printLabels({ images, printerName, layout, copies = 1 }) {
    console.log(`🖨️ [PRINT] Début impression ${images.length} étiquettes`);

    const results = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const imageData = images[i];
        const tempFilePath = await this.saveImageToTemp(imageData, `label_${i}`);

        const printResult = await this.printImageFile(tempFilePath, {
          printerName,
          layout,
          copies,
        });

        results.push({
          labelIndex: i,
          success: true,
          filePath: tempFilePath,
          printResult,
        });

        // Nettoyer le fichier temporaire après impression
        await this.cleanupTempFile(tempFilePath);
      } catch (error) {
        console.error(`❌ [PRINT] Erreur étiquette ${i}:`, error);
        results.push({
          labelIndex: i,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`✅ [PRINT] ${successCount}/${images.length} étiquettes imprimées`);

    return {
      totalLabels: images.length,
      successCount,
      results,
    };
  }

  /**
   * Sauvegarder l'image base64 en fichier temporaire
   */
  async saveImageToTemp(base64Data, filename) {
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    const tempFilePath = path.join(this.tempDir, `${filename}.png`);

    await fs.writeFile(tempFilePath, buffer);
    console.log(`💾 [PRINT] Image sauvée: ${tempFilePath}`);

    return tempFilePath;
  }

  /**
   * Imprimer un fichier image via PowerShell
   */
  async printImageFile(filePath, options = {}) {
    const { printerName, layout, copies = 1 } = options;

    // Script PowerShell pour impression d'étiquettes
    const powershellScript = this.generatePrintScript(filePath, {
      printerName,
      layout,
      copies,
    });

    return new Promise((resolve, reject) => {
      const powershell = spawn(
        'powershell',
        ['-ExecutionPolicy', 'Bypass', '-Command', powershellScript],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        }
      );

      let stdout = '';
      let stderr = '';

      powershell.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      powershell.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      powershell.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ [PRINT] Impression réussie: ${filePath}`);
          resolve({
            success: true,
            output: stdout,
            exitCode: code,
          });
        } else {
          console.error(`❌ [PRINT] Échec impression (code ${code}):`, stderr);
          reject(new Error(`Impression échouée (code ${code}): ${stderr}`));
        }
      });

      powershell.on('error', (error) => {
        console.error('❌ [PRINT] Erreur PowerShell:', error);
        reject(error);
      });
    });
  }

  /**
   * Générer le script PowerShell pour impression
   */
  generatePrintScript(filePath, options = {}) {
    const { printerName, layout, copies = 1 } = options;

    // Conversion des dimensions mm vers pixels (approximation pour 203 DPI étiqueteuse)
    const dpi = 92;
    const mmToPixels = (mm) => Math.round((mm * dpi) / 25.4);

    let widthPixels = 384; // Largeur par défaut étiqueteuse Brother
    let heightPixels = 240; // Hauteur par défaut

    if (layout) {
      widthPixels = mmToPixels(layout.width);
      heightPixels = mmToPixels(layout.height);
    }

    const script = `
# Script d'impression étiquettes optimisé
try {
    Write-Host "🖨️ Début impression: ${path.basename(filePath)}"
    
    # Chargement des assemblies .NET
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    # Charger l'image
    $image = [System.Drawing.Image]::FromFile("${filePath.replace(/\\/g, '\\\\')}")
    Write-Host "📷 Image chargée: $($image.Width)x$($image.Height)px"
    
    # Configuration de l'impression
    $printDocument = New-Object System.Drawing.Printing.PrintDocument
    
    ${printerName ? `$printDocument.PrinterSettings.PrinterName = "${printerName}"` : '# Imprimante par défaut'}
    
    # Vérifier que l'imprimante est disponible
    if (-not $printDocument.PrinterSettings.IsValid) {
        throw "Imprimante non disponible: $($printDocument.PrinterSettings.PrinterName)"
    }
    
    # Configuration page étiquette
    $printDocument.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize("Label", ${widthPixels}, ${heightPixels})
    $printDocument.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
    
    # Event handler pour le rendu
    $printDocument.add_PrintPage({
        param($sender, $e)
        
        # Calculer les dimensions pour ajustement optimal
        $pageWidth = $e.PageBounds.Width
        $pageHeight = $e.PageBounds.Height
        
        # Ajuster l'image aux dimensions de l'étiquette
        $scaleFactor = [Math]::Min($pageWidth / $image.Width, $pageHeight / $image.Height)
        $newWidth = $image.Width * $scaleFactor
        $newHeight = $image.Height * $scaleFactor
        
        # Centrer l'image
        $x = ($pageWidth - $newWidth) / 2
        $y = ($pageHeight - $newHeight) / 2
        
        # Rendu haute qualité
        $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        # Dessiner l'image
        $destRect = New-Object System.Drawing.Rectangle($x, $y, $newWidth, $newHeight)
        $e.Graphics.DrawImage($image, $destRect)
        
        Write-Host "✅ Rendu étiquette: $($newWidth)x$($newHeight)px à position ($x, $y)"
    })
    
    # Imprimer le nombre de copies demandé
    for ($i = 1; $i -le ${copies}; $i++) {
        Write-Host "🖨️ Impression copie $i/${copies}"
        $printDocument.Print()
        Start-Sleep -Milliseconds 100  # Délai entre copies
    }
    
    Write-Host "🎉 Impression terminée avec succès!"
    
} catch {
    Write-Error "❌ Erreur impression: $($_.Exception.Message)"
    exit 1
} finally {
    # Nettoyage
    if ($image) { $image.Dispose() }
    if ($printDocument) { $printDocument.Dispose() }
}
`;

    return script;
  }

  /**
   * Obtenir les imprimantes disponibles
   */
  async getAvailablePrinters() {
    const script = `
Get-WmiObject -Class Win32_Printer | Select-Object Name, DriverName, PortName, Default | ConvertTo-Json
`;

    return new Promise((resolve, reject) => {
      const powershell = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', script], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      powershell.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      powershell.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      powershell.on('close', (code) => {
        if (code === 0) {
          try {
            const printers = JSON.parse(stdout);
            const formattedPrinters = Array.isArray(printers) ? printers : [printers];

            console.log(`📋 [PRINT] ${formattedPrinters.length} imprimante(s) trouvée(s)`);
            resolve(formattedPrinters);
          } catch (error) {
            reject(new Error('Erreur parsing liste imprimantes'));
          }
        } else {
          reject(new Error(`Erreur récupération imprimantes: ${stderr}`));
        }
      });
    });
  }

  /**
   * Tester une imprimante
   */
  async testPrinter(printerName) {
    const testScript = `
try {
    Write-Host "🔍 Test imprimante: ${printerName || 'par défaut'}"
    
    # ÉTAPE 1: Chargement des assemblies en premier
    Write-Host "📦 Chargement des assemblies..."
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    Write-Host "✅ Assemblies chargées"
    
    # ÉTAPE 2: Vérifier si l'imprimante existe dans WMI
    Write-Host "🔍 Recherche de l'imprimante..."
    $allPrinters = Get-WmiObject -Class Win32_Printer
    
    ${
      printerName
        ? `
    $targetPrinter = $allPrinters | Where-Object {$_.Name -eq "${printerName}"}
    if (-not $targetPrinter) {
        Write-Error "❌ Imprimante '${printerName}' non trouvée"
        exit 1
    }
    Write-Host "✅ Imprimante trouvée dans WMI:"
    Write-Host "   Nom: $($targetPrinter.Name)"
    Write-Host "   État: $($targetPrinter.PrinterState)"
    Write-Host "   Status: $($targetPrinter.PrinterStatus)"
    `
        : ''
    }
    
    # ÉTAPE 3: Test PrintDocument
    Write-Host "🖨️ Test de connexion PrintDocument..."
    $printDocument = New-Object System.Drawing.Printing.PrintDocument
    
    ${printerName ? `$printDocument.PrinterSettings.PrinterName = "${printerName}"` : '# Imprimante par défaut'}
    
    Write-Host "📋 Résultats PrintDocument:"
    Write-Host "   Nom configuré: $($printDocument.PrinterSettings.PrinterName)"
    Write-Host "   Est valide: $($printDocument.PrinterSettings.IsValid)"
    
    if ($printDocument.PrinterSettings.IsValid) {
        Write-Host "✅ SUCCESS: Imprimante accessible via PrintDocument"
    } else {
        Write-Error "❌ FAIL: PrintDocument ne peut pas accéder à cette imprimante"
        exit 1
    }
    
} catch {
    Write-Error "❌ Exception: $($_.Exception.Message)"
    exit 1
} finally {
    if ($printDocument) { 
        $printDocument.Dispose() 
    }
}
`;

    return new Promise((resolve, reject) => {
      const powershell = spawn(
        'powershell',
        ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-Command', testScript],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        }
      );

      let stdout = '';
      let stderr = '';

      powershell.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[PS-OUT] ${output.trim()}`);
      });

      powershell.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error(`[PS-ERR] ${error.trim()}`);
      });

      powershell.on('close', (code) => {
        console.log(`[PS] Processus terminé avec code: ${code}`);

        if (code === 0) {
          resolve({
            success: true,
            available: true,
            output: stdout,
            diagnostics: {
              printerFound: stdout.includes('Imprimante trouvée'),
              printDocumentValid: stdout.includes('Test réussi'),
              fullOutput: stdout,
            },
          });
        } else {
          reject(new Error(`Test échoué (code ${code}): ${stderr || stdout}`));
        }
      });

      powershell.on('error', (error) => {
        console.error('❌ [PS] Erreur spawn PowerShell:', error);
        reject(error);
      });
    });
  }
  /**
   * Obtenir les paramètres d'impression par défaut
   */
  async getPrintSettings() {
    return {
      defaultDPI: 203,
      supportedFormats: ['PNG', 'JPEG', 'BMP'],
      defaultLabelSize: {
        width: 50,
        height: 30,
      },
      maxLabelSize: {
        width: 100,
        height: 200,
      },
      recommendedSettings: {
        imageFormat: 'PNG',
        quality: 'high',
        colorMode: 'monochrome',
      },
    };
  }

  /**
   * Nettoyer un fichier temporaire
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ [PRINT] Fichier temp nettoyé: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ [PRINT] Impossible de nettoyer: ${filePath}`, error.message);
    }
  }
}

module.exports = new LabelPrintingService();

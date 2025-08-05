//AppServe\services\labelPrintingService.js
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const os = require('os');

class LabelPrintingService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'labels');
    this.#ensureTempDirectory();
  }

  async #ensureTempDirectory() {
    await fs.mkdir(this.tempDir, { recursive: true }).catch(() => {});
  }

  // Méthode principale - conserve la logique de qualité
  async printLabels({ images, printerName, layout, copies = 1 }) {
    const results = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const tempFile = await this.#saveImage(images[i], `label_${Date.now()}_${i}`);
        await this.#printImage(tempFile, { printerName, layout, copies });

        results.push({ index: i, success: true });

        // Nettoyage après impression
        fs.unlink(tempFile).catch(() => {});
      } catch (error) {
        results.push({ index: i, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return { total: images.length, printed: successCount, details: results };
  }

  // Sauvegarde optimisée
  async #saveImage(base64Data, filename) {
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const filePath = path.join(this.tempDir, `${filename}.png`);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  // Impression HAUTE QUALITÉ mais script simplifié
  async #printImage(filePath, { printerName, layout, copies = 1 }) {
    const script = this.#generateQualityPrintScript(filePath, { printerName, layout, copies });

    return new Promise((resolve, reject) => {
      const ps = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', script], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';
      ps.stderr.on('data', (data) => (stderr += data));

      ps.on('close', (code) => {
        code === 0 ? resolve() : reject(new Error(`Impression échouée: ${stderr}`));
      });

      ps.on('error', reject);
    });
  }

  // Script PowerShell OPTIMISÉ mais qualité préservée
  #generateQualityPrintScript(filePath, { printerName, layout, copies = 1 }) {
    // Calcul dimensions étiquette (conservé de l'original)
    let widthPixels = 384; // Brother par défaut
    let heightPixels = 240;

    if (layout) {
      const dpi = 96;
      const mmToPixels = (mm) => Math.round((mm * dpi) / 25.4);
      widthPixels = mmToPixels(layout.width);
      heightPixels = mmToPixels(layout.height);
    }

    return `
try {
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    $image = [System.Drawing.Image]::FromFile("${filePath.replace(/\\/g, '\\\\')}")
    $printDoc = New-Object System.Drawing.Printing.PrintDocument
    
    ${printerName ? `$printDoc.PrinterSettings.PrinterName = "${printerName}"` : ''}
    
    if (-not $printDoc.PrinterSettings.IsValid) {
        throw "Imprimante non disponible: $($printDoc.PrinterSettings.PrinterName)"
    }
    
    # Configuration étiquette (dimensions précises conservées)
    $printDoc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize("Label", ${widthPixels}, ${heightPixels})
    $printDoc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)
    
    # QUALITÉ MAXIMALE (partie cruciale conservée)
    $printDoc.add_PrintPage({
        param($sender, $e)
        
        $pageWidth = $e.PageBounds.Width
        $pageHeight = $e.PageBounds.Height
        
        # Calcul mise à l'échelle optimale (conservé)
        $scaleFactor = [Math]::Min($pageWidth / $image.Width, $pageHeight / $image.Height)
        $newWidth = $image.Width * $scaleFactor
        $newHeight = $image.Height * $scaleFactor
        
        # Centrage précis
        $x = ($pageWidth - $newWidth) / 2
        $y = ($pageHeight - $newHeight) / 2
        
        # RENDU HAUTE QUALITÉ (essentiel pour étiquettes)
        $e.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $e.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        # Rendu final
        $destRect = New-Object System.Drawing.Rectangle($x, $y, $newWidth, $newHeight)
        $e.Graphics.DrawImage($image, $destRect)
    })
    
    # Impression des copies
    for ($i = 1; $i -le ${copies}; $i++) {
        $printDoc.Print()
        if ($i -lt ${copies}) { Start-Sleep -Milliseconds 100 }
    }
    
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    if ($image) { $image.Dispose() }
    if ($printDoc) { $printDoc.Dispose() }
}`;
  }

  // Imprimantes - version allégée
  async getAvailablePrinters() {
    const script = `Get-WmiObject Win32_Printer | Select Name, DriverName, Default | ConvertTo-Json`;

    return new Promise((resolve, reject) => {
      const ps = spawn('powershell', ['-Command', script]);

      let stdout = '';
      ps.stdout.on('data', (data) => (stdout += data));
      ps.on('error', reject);

      ps.on('close', (code) => {
        if (code !== 0) return reject(new Error('Erreur récupération imprimantes'));

        try {
          const printers = JSON.parse(stdout);
          resolve(Array.isArray(printers) ? printers : [printers]);
        } catch {
          reject(new Error('Erreur parsing imprimantes'));
        }
      });
    });
  }

  // Test simplifié mais fiable
  async testPrinter(printerName) {
    const script = `
Add-Type -AssemblyName System.Drawing
$printDoc = New-Object System.Drawing.Printing.PrintDocument
${printerName ? `$printDoc.PrinterSettings.PrinterName = "${printerName}"` : ''}

if ($printDoc.PrinterSettings.IsValid) { 
    Write-Host "SUCCESS" 
} else { 
    throw "Imprimante inaccessible" 
}
$printDoc.Dispose()`;

    return new Promise((resolve, reject) => {
      const ps = spawn('powershell', ['-Command', script]);
      ps.on('close', (code) => {
        code === 0 ? resolve({ available: true }) : reject(new Error('Test échoué'));
      });
    });
  }

  // Paramètres qualité étiquettes
  getPrintSettings() {
    return {
      defaultDPI: 203, // DPI étiqueteuse standard
      formats: ['PNG', 'JPEG'],
      defaultSize: { width: 50, height: 30 },
      maxSize: { width: 100, height: 200 },
      quality: {
        interpolation: 'HighQualityBicubic',
        smoothing: 'HighQuality',
        pixelOffset: 'HighQuality',
      },
    };
  }
}

module.exports = new LabelPrintingService();

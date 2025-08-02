// AppServe/services/BrotherService.js

const { exec } = require('child_process');

const path = require('path');

const fs = require('fs').promises;

const { existsSync } = require('fs');

class BrotherService {
  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'data', 'brother', 'templates');

    this.settingsPath = path.join(__dirname, '..', 'data', 'brother', 'settings.json');

    this.defaultSettings = {
      defaultPrinter: null,

      defaultTemplate: null,

      labelWidth: 29,

      maxLength: 120,

      dpi: 300,

      cutAfterPrint: true,

      autoSelect: true,
    };

    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.templatesPath, { recursive: true });

      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });

      if (!existsSync(this.settingsPath)) {
        await this.saveSettings(this.defaultSettings);
      }
    } catch (error) {
      console.error('Erreur initialisation répertoires Brother:', error);
    }
  }

  async getSettings() {
    try {
      const settingsData = await fs.readFile(this.settingsPath, 'utf8');

      return { ...this.defaultSettings, ...JSON.parse(settingsData) };
    } catch (error) {
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));

      return settings;
    } catch (error) {
      throw new Error(`Erreur sauvegarde paramètres: ${error.message}`);
    }
  }

  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();

      const updatedSettings = { ...currentSettings, ...newSettings };

      return await this.saveSettings(updatedSettings);
    } catch (error) {
      throw new Error(`Erreur mise à jour paramètres: ${error.message}`);
    }
  }

  async runPowerShell(script) {
    return new Promise((resolve, reject) => {
      const fs = require('fs');

      const os = require('os');

      const tempFile = path.join(os.tmpdir(), `ps_script_${Date.now()}.ps1`);

      try {
        fs.writeFileSync(tempFile, '\ufeff' + script, 'utf8');

        const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "chcp 65001 > $null; & '${tempFile}'"`;

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
          try {
            fs.unlinkSync(tempFile);
          } catch {}

          if (error) {
            return reject(new Error(`PowerShell: ${error.message}`));
          }

          if (stderr && stderr.trim()) {
            return reject(new Error(`PowerShell STDERR: ${stderr}`));
          }

          if (!stdout.trim()) {
            return reject(new Error(`Aucune sortie PowerShell.`));
          }

          try {
            const result = JSON.parse(stdout.trim());

            resolve(result);
          } catch (parseError) {
            reject(new Error(`Parse JSON: ${parseError.message}`));
          }
        });
      } catch (fileError) {
        reject(new Error(`Erreur fichier temporaire: ${fileError.message}`));
      }
    });
  }

  async checkHealth() {
    try {
      const script = `

        try {

          $bpac = New-Object -ComObject 'bpac.Document'

          $null = $bpac.Close()

          $result = @{

            status = 'ok'

            bridgeVersion = '1.0.0-powershell'

            bridgeAvailable = $true

            timestamp = (Get-Date).ToString('o')

          }

          Write-Output ($result | ConvertTo-Json)

        } catch {

          $result = @{

            status = 'error'

            error = $_.Exception.Message

            bridgeAvailable = $false

            timestamp = (Get-Date).ToString('o')

          }

          Write-Output ($result | ConvertTo-Json)

        }

      `;

      return await this.runPowerShell(script);
    } catch (error) {
      return {
        status: 'error',

        bridgeAvailable: false,

        error: error.message,

        timestamp: new Date().toISOString(),
      };
    }
  }

  async getInstalledPrinters() {
    try {
      const script = `

        try {

          # Test 1: Juste les imprimantes Windows d'abord

          $allPrinters = Get-Printer | Select-Object Name, DriverName, PrinterStatus

          

          $result = @{

            success = $true

            allWindowsPrinters = $allPrinters

            allCount = if ($allPrinters) { $allPrinters.Count } else { 0 }

            brotherApiTested = $false

          }

          

          # Test 2: Brother b-PAC seulement si le premier test marche

          try {

            $bpac = New-Object -ComObject 'bpac.Document'

            if ($bpac -and $bpac.Printer) {

              $brotherPrinters = $bpac.Printer.GetInstalledPrinters()

              $result.brotherPrinters = $brotherPrinters

              $result.brotherCount = if ($brotherPrinters) { $brotherPrinters.Length } else { 0 }

              $result.brotherApiTested = $true

            }

            $null = $bpac.Close()

          } catch {

            $result.brotherApiError = $_.Exception.Message

            $result.brotherApiTested = $false

          }

          

          Write-Output ($result | ConvertTo-Json -Depth 4 -Compress)

          

        } catch {

          $errorResult = @{

            success = $false

            error = $_.Exception.Message

            line = $_.InvocationInfo.ScriptLineNumber

          }

          Write-Output ($errorResult | ConvertTo-Json -Compress)

        }

      `;

      const result = await this.runPowerShell(script);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Extraire les imprimantes Brother/QL des imprimantes Windows

      let brotherPrinters = [];

      if (result.allWindowsPrinters) {
        brotherPrinters = result.allWindowsPrinters

          .filter(
            (p) =>
              p.Name &&
              (p.Name.toLowerCase().includes('brother') ||
                p.Name.toLowerCase().includes('ql') ||
                p.Name.toLowerCase().includes('pt') ||
                p.Name.toLowerCase().includes('qj')) // Ajout pour QL-600 qui pourrait s'afficher comme QJ
          )

          .map((p) => p.Name);
      }

      // Utiliser l'API Brother si disponible, sinon les imprimantes Windows filtrées

      const printers = result.brotherPrinters || brotherPrinters;

      const settings = await this.getSettings();

      return {
        printers: printers || [],

        count: printers?.length || 0,

        defaultPrinter: settings.defaultPrinter || printers?.[0],

        debug: {
          totalWindowsPrinters: result.allCount,

          brotherApiTested: result.brotherApiTested,

          brotherApiCount: result.brotherCount || 0,

          detectedBrother: brotherPrinters,

          brotherApiError: result.brotherApiError,
        },
      };
    } catch (error) {
      throw new Error(`Erreur liste imprimantes: ${error.message}`);
    }
  }

  async getAvailableTemplates() {
    try {
      const files = await fs.readdir(this.templatesPath);

      const templates = [];

      for (const file of files) {
        if (file.endsWith('.lbx')) {
          const fullPath = path.join(this.templatesPath, file);

          const stats = await fs.stat(fullPath);

          templates.push({
            name: file,

            displayName: file.replace('.lbx', ''),

            path: fullPath,

            size: stats.size,

            modified: stats.mtime.toISOString(),
          });
        }
      }

      return templates;
    } catch (error) {
      return [];
    }
  }

  async print(templateName, data, options = {}) {
    try {
      const templatePath = path.join(this.templatesPath, templateName);

      if (!existsSync(templatePath)) {
        throw new Error('Template non trouvé');
      }

      const settings = await this.getSettings();

      const printer = options.printer || settings.defaultPrinter || '';

      const copies = options.copies || 1;

      const escapedTemplatePath = templatePath.replace(/\\/g, '\\\\').replace(/'/g, "''");

      const dataJson = JSON.stringify(data);

      const escapedDataJson = dataJson.replace(/'/g, "''");

      const script = `

try {

  $bpac = New-Object -ComObject 'bpac.Document'

  

  $opened = $bpac.Open('${escapedTemplatePath}')

  if (-not $opened) {

    throw "Impossible d'ouvrir le template: ${templateName}"

  }

  

  ${printer ? `$null = $bpac.SetPrinter('${printer}', $true)` : '# Aucune imprimante spécifiée'}

  

  $dataJson = '${escapedDataJson}'

  $data = $dataJson | ConvertFrom-Json

  foreach ($property in $data.PSObject.Properties) {

    try {

      $obj = $bpac.GetObject($property.Name)

      if ($obj) {

        $null = ($obj.Text = $property.Value.ToString())

      }

    } catch {}

  }

  

  $null = $bpac.StartPrint('', 0)

  $success = $true

  for ($i = 0; $i -lt ${copies}; $i++) {

    $printResult = $bpac.PrintOut(1, 0)

    if (-not $printResult) {

      $success = $false

      break

    }

  }

  $null = $bpac.EndPrint()

  $null = $bpac.Close()

  

  $result = @{

    success = $success

    message = if ($success) { "Impression réussie" } else { "Échec impression" }

    printer = '${printer}'

    copies = ${copies}

  }

  

  Write-Output ($result | ConvertTo-Json -Compress)

  

} catch {

  try { $null = $bpac.Close() } catch {}

  

  $errorResult = @{

    success = $false

    error = $_.Exception.Message

  }

  

  Write-Output ($errorResult | ConvertTo-Json -Compress)

}`;

      const result = await this.runPowerShell(script);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,

        message: 'Étiquette imprimée avec succès',

        printer: result.printer,

        copies: copies,

        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Erreur impression: ${error.message}`);
    }
  }

  async generatePreview(templateName, data, options = {}) {
    try {
      const templatePath = path.join(this.templatesPath, templateName);

      if (!existsSync(templatePath)) {
        throw new Error('Template non trouvé');
      }

      const dpi = options.dpi || 300;

      const escapedTemplatePath = templatePath.replace(/\\/g, '\\\\').replace(/'/g, "''");

      const dataJson = JSON.stringify(data);

      const escapedDataJson = dataJson.replace(/'/g, "''");

      const script = `

try {

  $bpac = New-Object -ComObject 'bpac.Document'

  

  $opened = $bpac.Open('${escapedTemplatePath}')

  if (-not $opened) {

    throw "Impossible d'ouvrir le template: ${templateName}"

  }

  

  # Appliquer les données

  $dataJson = '${escapedDataJson}'

  $data = $dataJson | ConvertFrom-Json

  foreach ($property in $data.PSObject.Properties) {

    try {

      $obj = $bpac.GetObject($property.Name)

      if ($obj) {

        $null = ($obj.Text = $property.Value.ToString())

      }

    } catch {}

  }

  

  # Générer l'image (format 4 = PNG)

  $imageData = $bpac.GetImageData(4, 0, ${dpi})

  $base64 = [Convert]::ToBase64String($imageData)

  $null = $bpac.Close()

  

  $result = @{

    success = $true

    imageBase64 = $base64

    mimeType = "image/png"

    dpi = ${dpi}

    templateName = '${templateName}'

  }

  

  Write-Output ($result | ConvertTo-Json -Compress)

  

} catch {

  try { $null = $bpac.Close() } catch {}

  

  $errorResult = @{

    success = $false

    error = $_.Exception.Message

  }

  

  Write-Output ($errorResult | ConvertTo-Json -Compress)

}`;

      const result = await this.runPowerShell(script);

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,

        data: {
          imageBase64: result.imageBase64,

          mimeType: result.mimeType,

          dpi: result.dpi,

          templateName: result.templateName,
        },
      };
    } catch (error) {
      throw new Error(`Erreur aperçu: ${error.message}`);
    }
  }

  async getTemplateObjects(templateName) {
    try {
      const templatePath = path.join(this.templatesPath, templateName);

      if (!existsSync(templatePath)) {
        throw new Error('Template non trouvé');
      }

      const escapedTemplatePath = templatePath.replace(/\\/g, '\\\\').replace(/'/g, "''");

      const script = `

try {

  $bpac = New-Object -ComObject 'bpac.Document'

  

  if (-not $bpac.Open('${escapedTemplatePath}')) {

    throw "Impossible d'ouvrir le template"

  }

    $templateInfo = @{
    width = $bpac.Width
    length = $bpac.Length
    orientation = $bpac.Orientation
    errorCode = $bpac.ErrorCode
  }

  $textCount = $bpac.GetTextCount()

  $foundObjects = @()

  

  # Objets texte

  for ($i = 0; $i -lt $textCount; $i++) {

    $setTextResult = $bpac.SetText($i, "")

    if ($setTextResult -eq $true) {

      $objInfo = @{

        index = $i

        type = "Text"

        name = "TextObject_$i"

        realName = $null

        exists = $true

      }

      $foundObjects += $objInfo

    }

  }

  

  # Objets barcode

  for ($i = 0; $i -lt 10; $i++) {

    try {

      $setBarcodeResult = $bpac.SetBarcodeData($i, "")

      if ($setBarcodeResult -eq $true) {

        $objInfo = @{

          index = $i

          type = "Barcode"

          name = "BarcodeObject_$i"

          realName = $null

          exists = $true

        }

        $foundObjects += $objInfo

      }

    } catch {

      break

    }

  }

  

  # Trouver les vrais noms pour les objets texte

  $textNames = @(

    'objName', 'objCompany', 'objDate', 'objBarcode', 'objCodeBarre', 'objCode',

    'Name', 'Company', 'Date', 'Barcode', 'CodeBarre', 'Code'

  )

  

  foreach ($name in $textNames) {

    try {

      $index = $bpac.GetTextIndex($name)

      if ($index -ge 0) {

        foreach ($obj in $foundObjects) {

          if ($obj.index -eq $index -and $obj.type -eq "Text") {

            $obj.realName = $name

            $obj.name = $name

            break

          }

        }

      }

    } catch {}

  }

  

  # Trouver les vrais noms pour les objets barcode (Code à barres1 à Code à barres10)

  $barcodeNames = @(

    'Code à barres1', 'Code à barres2', 'Code à barres3', 'Code à barres4', 'Code à barres5',

    'Code à barres6', 'Code à barres7', 'Code à barres8', 'Code à barres9', 'Code à barres10'

  )

  

  foreach ($name in $barcodeNames) {

    try {

      $index = $bpac.GetTextIndex($name)

      if ($index -ge 0) {

        foreach ($obj in $foundObjects) {

          if ($obj.type -eq "Barcode") {

            $obj.realName = $name

            $obj.name = $name

            break

          }

        }

      }

    } catch {}

  }

  

  $null = $bpac.Close()

  

  $result = @{

    success = $true

    templateName = '${templateName}'

    textCount = $textCount

    foundObjects = $foundObjects

    totalFound = $foundObjects.Count

  }

  

  Write-Output ($result | ConvertTo-Json -Depth 3 -Compress)

  

} catch {

  try { $null = $bpac.Close() } catch {}

  

  $errorResult = @{

    success = $false

    error = $_.Exception.Message

  }

  

  Write-Output ($errorResult | ConvertTo-Json -Compress)

}`;

      const result = await this.runPowerShell(script);

      return result;
    } catch (error) {
      throw new Error(`Erreur analyse template: ${error.message}`);
    }
  }

  async updateSettings(newSettings) {
    try {
      const currentSettings = await this.getSettings();

      const updatedSettings = { ...currentSettings, ...newSettings };

      return await this.saveSettings(updatedSettings);
    } catch (error) {
      throw new Error(`Erreur mise à jour paramètres: ${error.message}`);
    }
  }
}

module.exports = BrotherService;

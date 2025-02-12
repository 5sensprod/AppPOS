const { app, BrowserWindow, Tray, Menu } = require('electron');
    const path = require('path');

    let mainWindow;
    let tray;

    function createWindow () {
      mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js')
        }
      });

      mainWindow.loadURL('http://localhost:3000');

      mainWindow.on('closed', function () {
        mainWindow = null;
      });
    }

    app.on('ready', () => {
      createWindow();

      tray = new Tray(path.join(__dirname, 'icon.png'));
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Open', click: () => { mainWindow.show(); } },
        { label: 'Quit', click: () => { app.quit(); } }
      ]);
      tray.setContextMenu(contextMenu);
      tray.setToolTip('AppPOS');
    });

    app.on('window-all-closed', function () {
      if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', function () {
      if (mainWindow === null) createWindow();
    });

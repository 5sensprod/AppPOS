const { Tray, Menu } = require('electron');
    const path = require('path');

    let tray;

    function createTray(mainWindow) {
      tray = new Tray(path.join(__dirname, 'icon.png'));
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Open', click: () => { mainWindow.show(); } },
        { label: 'Quit', click: () => { app.quit(); } }
      ]);
      tray.setContextMenu(contextMenu);
      tray.setToolTip('AppPOS');
    }

    module.exports = createTray;

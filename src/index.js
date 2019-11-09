// Modules to control application life and create native browser window
const {app, BrowserWindow, Menu, shell} = require('electron')
const defaultMenu = require('electron-default-menu');
const {checkExtensionVersion} = require('./extension')

require('update-electron-app')()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  if (mainWindow) {return}
  mainWindow = new BrowserWindow({
    width: 800,
    height: 400,
    minWidth: 800,
    minHeight: 400,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('src/importer.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

let installerWindow

function showInstaller () {
  if (installerWindow) {return}
  installerWindow = new BrowserWindow({
    width: 450,
    height: 550,
    resizable: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true
    }
  })
  installerWindow.loadFile('src/installer.html')
  installerWindow.on('closed', function () {
    installerWindow = null
  })
}


// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow == null) {
    createWindow()
  }
})

app.on('open-file', function(event, path) {
  event.preventDefault()
  if(!mainWindow) {
    if (!app.isReady()) {
      app.once('ready', () => {
        createWindow()
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('open-file', path)
        })
      })
    } else {
      createWindow()
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('open-file', path)
      })
    }
  } else {
    mainWindow.webContents.send('open-file', path)
  }
})

function setupMenu() {
  const menu = defaultMenu(app, shell);
 
  // Add custom menu
  menu[0].submenu.splice(1,0, {
    label: 'Install MoneyMoney extension',
      click: (item, focusedWindow) => {
        showInstaller()
    }
  })
  menu[0].submenu.splice(1,0, { type: 'separator' })
 
  // Set top-level application menu, using modified template
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
}

app.on('ready', () => {
  if (!checkExtensionVersion()) {
    showInstaller()
  } else {
    createWindow()
  }
  setupMenu()
})
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const {
  app,
  BrowserWindow,
  ipcMain
} = require('electron');
const path = require('path');
const V86Starter = require(path.join(__dirname, 'build', 'libv86.js')).V86Starter;

const settings = {
  wasm_path: path.join(__dirname, 'build', 'v86.wasm'),
  memory_size: 64 * 1024 * 1024,
  vga_memory_size: 4 * 1024 * 1024,
  bios: {
    url: path.join(__dirname, 'bios', 'seabios.bin'),
  },
  vga_bios: {
    url: path.join(__dirname, 'bios', 'vgabios.bin'),
  },
  fda: {

  },
  cdrom: {
    //url: "test_images/kolibri.iso"
    //url: "d:/images/ubuntu-14.04.6-desktop-i386.iso" // Dont forget to add memory
    //url: "d:/images/Windows 98IF 2014-02-25A.iso"
  },
  hda: {
    //url: "test_images/dos.img",
    //url: "test_images/copy_winnt.img",
    url: "test_images/win1.img",
    //url: "test_images/31.img",
  },
  acpi: false, // Need for ubuntu
  autostart: true,
  allow_only_graphical: true, // For perfomance
  graphic_fps: 5 // Make smaller if you have freezes in different resolutions
};

if (require('electron-squirrel-startup')) {
  app.quit();
}

const _createWindow = function() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 480,
    minWidth: 160,
    minHeight: 100,
    icon: path.join(__dirname, 'src', 'favicon.ico'),
    skipTaskbar: false,
    title: 'v86ui',
    frame: true,
    hasShadow: false,
    transparent: false,
    webPreferences: {
      devTools: true,
      enableRemoteModule: true,
      javascript: true,
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
};

let mainWindow;
let v86;
let offset_w;
let offset_h;

function createWindow() {
  _createWindow();

  mainWindow.setResizable(false);
  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.webContents.openDevTools();
}

function resizeWindow(w_, h_) {
  //mainWindow.setResizable(true);
  //mainWindow.setResizable(false);
  mainWindow.setMinimumSize(w_ + offset_w, h_ + offset_h);
  mainWindow.setMaximumSize(w_ + offset_w, h_ + offset_h);
  mainWindow.setSize(w_ + offset_w, h_ + offset_h);
  mainWindow.webContents.send('r');
}

function initEmulator() {
  set_text_size(80, 25);
  v86 = new V86Starter(settings);
}

function set_text_size(w_, h_) {
  text_mode_width = w_;
  text_mode_height = h_;
  width = w_ * text_w_size;
  height = h_ * text_h_size;
  resizeWindow(width, height);
}


const text_w_size = 9,
  text_h_size = 16,
  sens_x = 0.2,
  sens_y = 0.2,
  graphic_frame_rate = 1000 / (settings.graphic_fps || 5);
var text_mode_width,
  text_mode_height,
  width,
  height,
  skip_space = true,
  is_graphical = false,
  cursor_row = 0,
  cursor_col = 0;
var graphic_buffer32;
var running = true;

function graphic_draw() {
  if (!running)
    return;
  v86.bus.send('screen-fill-buffer');
}

function bindEvents() {
  v86.bus.register('screen-set-mode', function(data) {
    is_graphical = data;
    if (data) {
      // Do something
    } else {
      clearInterval(graphic_draw);
      set_text_size(text_mode_width, text_mode_height);
    }
    mainWindow.webContents.send('g', data);
  });

  v86.bus.register("screen-put-char", function(data) {
    if (is_graphical)
      return;
    if (skip_space) {
      if (data[2] == 0 || data[2] == 32)
        return;
      skip_space = false;
    }
    if (settings.allow_only_graphical)
      return;
    mainWindow.webContents.send(
      'c',
      data[0],
      data[1],
      data[2],
      data[3],
      data[4]
    );
  });

  v86.bus.register('screen-set-size-text', function(data) {
    if (!is_graphical)
      return;
    set_text_size(data[0], data[1]);
  });

  v86.bus.register('screen-set-size-graphical', function(data) {
    resizeWindow(data[0], data[1]);
    mainWindow.webContents.send('sg', data[0], data[1], data[2], data[3]);
  });

  v86.bus.register('screen-clear', function() {
    mainWindow.webContents.send('z');
  });

  v86.bus.register('screen-update-cursor', function(data) {
    if (data[0] == cursor_row && data[1] == cursor_col) {
      return;
    }
    cursor_row = data[0];
    cursor_col = data[1];
    mainWindow.webContents.send('f', data[0], data[1]);
  });

  v86.bus.register('screen-fill-buffer-end', function(data) {
    if (!running)
      return;
    mainWindow.webContents.send('d', data, graphic_buffer32);
  });

  ipcMain.on('p', function(e, dx, dy) { // Mouse Move
    v86.bus.send('mouse-delta', [dx * sens_x, dy * -sens_y]);
  });

  ipcMain.on('m', function(e, buttons) { // Mouse Down/Up
    v86.bus.send('mouse-click', buttons);
  });

  ipcMain.on('k', function(e, code) { // Key Down/Up
    v86.bus.send('keyboard-code', code);
  });

  ipcMain.on('tt', function(e, new_buffer) { // Get Graphic Buffer
    clearInterval(graphic_draw);
    graphic_buffer32 = new_buffer;
    v86.bus.send('screen-tell-buffer', [graphic_buffer32], [graphic_buffer32.buffer]);
    setInterval(graphic_draw, graphic_frame_rate);
  });
}

ipcMain.on('pre-init', function(e, d1_, d2_) {
  offset_w = d1_;
  offset_h = d2_;
  mainWindow.webContents.send('const-size-text', text_w_size, text_h_size);
  initEmulator();
  bindEvents();
});

app.on('ready', function() {
  createWindow();
});

app.on('window-all-closed', function() {
  running = false;
  clearInterval(graphic_draw);
  if (v86) {
    v86.destroy();
    clearInterval(graphic_draw);
  }
  app.quit();
});

app.on('activate', function() {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

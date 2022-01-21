function controls_init(electron, canvas) {
  var is_mouse_locked = false;
  var mouse_lock_x;
  var mouse_lock_y;
  var buttons = [false, false, false];

  function send_to_controller(code) {
    electron.ipcRenderer.send('k', code);
  }

  function handle_code(code, keydown, is_repeat) {
    if (keydown) {
      if (keys_pressed[code] && !is_repeat) {
        handle_code(code, false);
      }
    } else {
      if (!keys_pressed[code]) {
        return;
      }
    }

    keys_pressed[code] = keydown;

    if (!keydown) {
      code |= 0x80;
    }

    if (code > 0xFF) {
      // prefix
      send_to_controller(code >> 8);
      send_to_controller(code & 0xFF);
    } else {
      send_to_controller(code);
    }
  }

  window.addEventListener('mousedown', function(e) {
    if (!is_mouse_locked) {
      return;
    }
    if (3 > e.button >= 0) {
      buttons[e.button] = true;
      electron.ipcRenderer.send('m', buttons);
    }
  });

  window.addEventListener('mouseup', function(e) {
    if (!is_mouse_locked) {
      if (e.button == 0 && window.innerWidth > e.clientX > 0 && window.innerHeight > e.clientY > 0) {
        mouse_lock_x = e.clientX;
        mouse_lock_y = e.clientY;
        is_mouse_locked = true;
        canvas.requestPointerLock();
      }
      return;
    }
    if (3 > e.button >= 0) {
      buttons[e.button] = false;
      electron.ipcRenderer.send('m', buttons);
    }
  });

  window.addEventListener('mousemove', function(e) {
    if (!is_mouse_locked) {
      return;
    }
    if (e.clientX !== mouse_lock_x || e.clientY !== mouse_lock_y) {
      is_mouse_locked = false;
      document.exitPointerLock();
      return;
    }
    electron.ipcRenderer.send('p', e.movementX, e.movementY);
  });

  window.addEventListener('keydown', function(e) {
    if (is_mouse_locked && (e.code == 'Escape' || e.key == 'Escape' || e.keyCode == 27)) {
      return;
    }
    handle_code(translate(e), true, e.repeat);
  });

  window.addEventListener('keyup', function(e) {
    if (is_mouse_locked && (e.code == 'Escape' || e.key == 'Escape' || e.keyCode == 27)) {
      is_mouse_locked = false;
      document.exitPointerLock();
      return;
    }
    handle_code(translate(e), false, e.repeat);
  });
}

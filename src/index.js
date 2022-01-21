function main() {
  const electron = require('electron');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', {
    alpha: false
  });
  ctx["imageSmoothingEnabled"] = false;

  const add_w = window.outerWidth - window.innerWidth;
  const add_h = window.outerHeight - window.innerHeight;

  var text_w_size = 9,
    text_h_size = 16,
    text_h_offset = 12;

  var is_graphical = false,
    graphical_mode_width,
    graphical_mode_height,
    graphic_image_data,
    graphic_buffer32;

  function number_as_color(n) {
    // TODO: fix colors sometimes incorrect

    n = n.toString(16);

    return "#" + Array(7 - n.length).join("0") + n;
  }

  function clear_canvas() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function on_resize() {
    if (is_graphical)
      return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.title = 'v86ui [' + window.innerWidth + 'x' + window.innerHeight + ']';
    clear_canvas();
  }

  //window.onresize = on_resize;
  electron.ipcRenderer.on('r', on_resize); // Resize screen

  electron.ipcRenderer.on('z', clear_canvas); // Clear screen

  electron.ipcRenderer.on('c', function(e, row, col, chr, bg_color, fg_color) { // Put char
    ctx.fillStyle = number_as_color(bg_color);
    ctx.fillRect(
      col * text_w_size,
      row * text_h_size,
      text_w_size,
      text_h_size
    );
    ctx.font = 'bold 15px bold Liberation Mono, DejaVu Sans Mono, Courier New, monospace';
    ctx.fillStyle = number_as_color(fg_color);
    ctx.fillText(
      charmap[chr],
      col * text_w_size,
      row * text_h_size + text_h_offset
    );
  });

  electron.ipcRenderer.on('f', function(e, new_row, new_col) { // Update cursor position
    has_cursor_changed = true;
    // TODO: finish function
  });

  electron.ipcRenderer.on('g', function(e, new_graphical) { // Is Graphical
    is_graphical = new_graphical;
  });

  electron.ipcRenderer.on('d', function(e, layers, new_buffer) { // Is Graphical
    graphic_buffer32.set(new_buffer, 0);

    layers.forEach((layer) => {
      ctx.putImageData(
        graphic_image_data,
        layer.screen_x - layer.buffer_x,
        layer.screen_y - layer.buffer_y,
        layer.buffer_x,
        layer.buffer_y,
        layer.buffer_width,
        layer.buffer_height
      );
    });
  });

  electron.ipcRenderer.on('sg', function(e, width, height, buffer_width, buffer_height) { // Graphical Size
    document.title = 'v86ui [' + width + 'x' + height + ']';
    canvas.width = width; // Maybe is not changed ???
    canvas.height = height;

    graphical_mode_width = width;
    graphical_mode_height = height;

    graphic_image_data = ctx.createImageData(buffer_width, buffer_height);
    graphic_buffer32 = new Int32Array(graphic_image_data.data.buffer);

    electron.ipcRenderer.send('tt', graphic_buffer32);
  });

  electron.ipcRenderer.on('const-size-text', function(e, w_, h_) {
    text_w_size = w_;
    text_h_size = h_;
    text_h_offset = Math.round(h_ / 4 * 3)
  });
  controls_init(electron, canvas);

  setTimeout(function() {
    electron.ipcRenderer.send('pre-init', add_w, add_h);
  }, 5000);
}
window.onload = main;

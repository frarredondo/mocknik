(function () {
  var container = document.getElementById('container');
  var controlled = document.getElementById('controlled');
  var state = '';

  function render() {
    container.setAttribute('data-state', state);
    if (controlled.value !== state) {
      controlled.value = state;
    }
  }

  controlled.addEventListener('input', function () {
    state = controlled.value;
    container.setAttribute('data-state', state);
    window.setTimeout(render, 0);
  });

  render();
})();

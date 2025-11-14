document.addEventListener('DOMContentLoaded', function () {
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('global-nav'); // header.phpで指定したID

  if (btn && nav) {
    btn.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
});
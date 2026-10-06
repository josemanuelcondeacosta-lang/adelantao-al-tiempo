// Interfaz compartida — Adelanta’o al Tiempo
// Muestra en el encabezado cuántos productos hay en el pedido.
(function () {
  var KEY = "adelantao-zapatos-carrito";
  function total() {
    try {
      var items = JSON.parse(localStorage.getItem(KEY)) || [];
      if (!Array.isArray(items)) return 0;
      return items.reduce(function (s, x) {
        if (!x || typeof x.id !== "string" || typeof x.nombre !== "string") return s;
        var n = Number(x.cantidad);
        return s + (Number.isSafeInteger(n) && n > 0 ? n : 1);
      }, 0);
    } catch (e) { return 0; }
  }
  function pintar() {
    var n = total();
    var texto = n > 0 ? String(n) : "";
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      if (el.textContent !== texto) el.textContent = texto;
    });
  }
  pintar();
  window.addEventListener("ad-legacy-carrito", pintar);
  window.addEventListener("storage", pintar);
  window.addEventListener("pageshow", pintar);
  // El contenido se dibuja después de cargar; reintenta hasta que exista el encabezado.
  new MutationObserver(pintar).observe(document.documentElement, { childList: true, subtree: true });
})();

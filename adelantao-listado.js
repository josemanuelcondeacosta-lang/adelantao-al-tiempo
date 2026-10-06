// Utilidades del listado de productos — Adelanta’o al Tiempo
export function precioNum(precio) {
  const n = parseInt(String(precio).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export function etiquetaTallas(p) {
  const s = p.sizes || [];
  return s.length ? "Tallas " + s[0] + "–" + s[s.length - 1] : "";
}

// Datos que necesita la tarjeta de producto (el elemento <img> lo crea cada página con React).
export function tarjeta(p, React) {
  return {
    ...p,
    href: "adelantao-producto.dc.html?p=" + p.id,
    priceCls: precioNum(p.price) !== null ? "ad-price" : "ad-price ad-price-tbc",
    sizesLabel: etiquetaTallas(p),
    noImg: !p.img,
    media: p.img ? React.createElement("img", { src: p.img, alt: p.name, loading: "lazy", decoding: "async", width: 800, height: 800 }) : null
  };
}

const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Aplica búsqueda, filtro y orden a una lista de productos.
export function filtrar(lista, { q, filtro, orden }, filtros) {
  const texto = norm(q || "").trim();
  const f = filtros[filtro] || filtros[0];
  let out = lista.filter(p => (!f.re || f.re.test(norm(p.name + " " + p.meta))) && (!texto || norm(p.name + " " + p.meta).includes(texto)));
  if (orden === "menor" || orden === "mayor") {
    const dir = orden === "menor" ? 1 : -1;
    out = out.slice().sort((a, b) => {
      const pa = precioNum(a.price), pb = precioNum(b.price);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return (pa - pb) * dir;
    });
  }
  return out;
}

export function contarFiltros(lista, filtros) {
  return filtros.map(f => f.re ? lista.filter(p => f.re.test(norm(p.name + " " + p.meta))).length : lista.length);
}

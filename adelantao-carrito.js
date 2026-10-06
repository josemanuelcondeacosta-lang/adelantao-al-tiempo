// Carrito compartido — Adelanta’o al Tiempo
import { productos } from "./adelantao-productos.js";
const productosPorId = productos.slice().sort((a, b) => b.id.length - a.id.length);
const KEY = "adelantao-zapatos-carrito";
export const WHATSAPP = "https://wa.me/message/QQ35ZM7DGCIPA1";
const WHATSAPP_PEDIDOS = "https://wa.me/573011502730";

export function leer() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(items)) return [];
    return items.filter(x => x && typeof x.id === "string" && typeof x.nombre === "string")
      .map(x => {
        const producto = productosPorId.find(p => x.id === p.id || x.id.startsWith(p.id + "-"));
        return { ...x, cantidad: cantidadValida(x.cantidad), precio: producto ? producto.price : x.precio };
      });
  } catch (e) { return []; }
}
function cantidadValida(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}
function guardar(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("at-legacy-carrito"));
  return items;
}
export function agregar(item) {
  item = { ...item, cantidad: cantidadValida(item.cantidad) };
  const items = leer();
  const i = items.findIndex(x => x.id === item.id && x.talla === item.talla);
  if (i >= 0) items[i].cantidad = cantidadValida(items[i].cantidad + item.cantidad);
  else items.push(item);
  return guardar(items);
}
export function cambiarCantidad(index, delta) {
  const items = leer();
  if (!Number.isInteger(index) || !items[index] || !Number.isSafeInteger(delta)) return items;
  items[index].cantidad = Math.max(1, items[index].cantidad + delta);
  return guardar(items);
}
export function quitar(index) {
  const items = leer();
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return items;
  items.splice(index, 1);
  return guardar(items);
}
export function vaciar() { return guardar([]); }
export function totalUnidades() { return leer().reduce((s, x) => s + x.cantidad, 0); }

export function mensajeWhatsApp(items) {
  const lineas = items.map((x, n) => {
    const partes = [x.nombre];
    if (x.talla) partes.push("talla " + x.talla);
    partes.push("cantidad " + x.cantidad);
    partes.push(x.precio);
    return (n + 1) + ". " + partes.join(" · ");
  });
  const conPrecio = items.filter(x => /\d/.test(String(x.precio)));
  let cierre = "Todos los productos quedan por cotizar.";
  if (conPrecio.length) {
    const total = conPrecio.reduce((s, x) => {
      const v = parseInt(String(x.precio).replace(/[^0-9]/g, ""), 10) || 0;
      return s + v * x.cantidad;
    }, 0);
    cierre = "Total de los productos con precio: $" + total.toLocaleString("es-CO");
    if (conPrecio.length !== items.length) cierre += " (el resto queda por cotizar)";
  }
  return "Hola Adelanta’o al Tiempo, quiero hacer este pedido:\n\n" + lineas.join("\n") + "\n\n" + cierre;
}
export function enlaceWhatsApp(items = leer()) {
  return WHATSAPP_PEDIDOS + "?text=" + encodeURIComponent(mensajeWhatsApp(items));
}

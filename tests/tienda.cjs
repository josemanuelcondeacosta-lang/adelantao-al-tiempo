const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
process.chdir(path.join(__dirname, '..'));
const load = async file => import(pathToFileURL(path.resolve(file)).href);
(async () => {
  const [cat, car, lst] = await Promise.all(['adelantao-productos.js', 'adelantao-carrito.js', 'adelantao-listado.js'].map(load));
  let stored = null, events = 0;
  global.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  global.window = { dispatchEvent: () => events++ };
  for (const invalid of ['{', '{}', 'null', '42', '[null,{}]']) {
    stored = invalid; assert.deepEqual(car.leer(), []);
  }
  const item = { id: 'test-38', nombre: 'Modelo & azul', talla: '38', cantidad: '2', precio: '$50.000' };
  stored = null;
  car.agregar(item); car.agregar(item);
  assert.equal(car.totalUnidades(), 4);
  car.agregar({ ...item, id: 'test-39', talla: '39', cantidad: 1 });
  assert.equal(car.leer().length, 2);
  car.cambiarCantidad(0, -10); assert.equal(car.leer()[0].cantidad, 1);
  car.cambiarCantidad(0, 2); assert.equal(car.totalUnidades(), 4);
  car.quitar(-1); assert.equal(car.leer().length, 2);
  const link = new URL(car.enlaceWhatsApp());
  assert.equal(link.pathname, '/573011502730');
  assert.equal(link.searchParams.get('text'), car.mensajeWhatsApp(car.leer()));
  assert.match(link.searchParams.get('text'), /200\.000/);
  assert.match(car.mensajeWhatsApp([item, { ...item, precio: 'Por cotizar' }]), /resto queda por cotizar/);
  car.quitar(0); assert.equal(car.leer()[0].talla, '39');
  car.vaciar(); assert.equal(car.totalUnidades(), 0); assert.ok(events > 0);
  assert.equal(new Set(cat.productos.map(p => p.id)).size, cat.productos.length);
  // asignacion-precios.json es privado (no está en el repositorio); sin él se omite esta comprobación.
  const assignments = fs.existsSync('asignacion-precios.json') ? JSON.parse(fs.readFileSync('asignacion-precios.json', 'utf8')) : null;
  if (assignments) for (const p of cat.productos) {
    const assigned = assignments.find(x => x.img === p.img);
    assert.ok(assigned && assigned.precio > 0 && assigned.fila_libro > 1);
    assert.equal(assigned.columna, 'COSTO');
    assert.equal(lst.precioNum(p.price), assigned.precio);
    assert.ok(['Zapatos', 'Chancletas'].includes(p.seccion));
    assert.ok(['libro', 'similar'].includes(assigned.origen_precio));
  }
  stored = JSON.stringify([{ id: cat.zapatos[0].id + '-38', nombre: cat.zapatos[0].name, talla: '38', cantidad: 2, precio: '$1' }]);
  assert.equal(car.leer()[0].precio, cat.zapatos[0].price);
  assert.ok(new URL(car.enlaceWhatsApp()).searchParams.get('text').includes(cat.zapatos[0].price));
  car.vaciar();
  const assets = new Set();
  for (const p of cat.productos) {
    assert.equal(cat.findProducto(p.id), p);
    assert.ok(p.name && p.sizes.length && p.price);
    for (const v of [p, ...(p.colors || [])]) {
      for (const file of [v.img, v.modelo, ...(v.fotos || [])].filter(Boolean)) {
        assert.ok(fs.existsSync(file), 'Imagen faltante: ' + file); assets.add(file);
      }
    }
  }
  const filters = [{ re: null }, { re: /clasico/ }];
  const described = [{ name: 'Nike Air Force 1', meta: 'Silueta baja clásica', price: '$100.000' }];
  const categoryFilters = [{ re: null }, { re: /clasic/ }];
  assert.equal(lst.filtrar(described, { filtro: 1 }, categoryFilters).length, 1);
  assert.deepEqual(lst.contarFiltros(described, categoryFilters), [1, 1]);
  assert.ok(lst.filtrar(cat.zapatos, { q: 'CLÁSICO' }, filters).length > 0);
  assert.equal(lst.filtrar(cat.zapatos, { q: 'zzzinexistente' }, filters).length, 0);
  for (const order of ['menor', 'mayor']) {
    const sorted = lst.filtrar(cat.productos, { orden: order }, filters);
    const known = sorted.map(p => lst.precioNum(p.price)).filter(n => n !== null);
    for (let i = 1; i < known.length; i++) assert.ok(order === 'menor' ? known[i] >= known[i-1] : known[i] <= known[i-1]);
    assert.equal(known.length, cat.productos.length);
  }
  const React = { createElement: (type, props) => ({ type, props }) };
  class DCLogic { setState(value) { Object.assign(this.state, typeof value === 'function' ? value(this.state) : value); } }
  const components = {};
  for (const file of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/(?:href|src)="([^"{}]+)"/g)) {
      const url = m[1];
      if (/^(https?:|#|data:)/.test(url)) continue;
      assert.ok(fs.existsSync(url.split(/[?#]/)[0]), `${file}: enlace roto ${url}`);
    }
    const script = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
    if (script) {
      const Component = new Function('DCLogic', 'React', script[1] + '\nreturn Component;')(DCLogic, React);
      const instance = new Component(); instance.renderVals(); components[file] = instance;
    }
  }
  const product = components['adelantao-producto.dc.html']; product.car = car; product.lst = lst;
  for (const p of cat.productos) {
    product.state.p = p; product.state.talla = p.sizes[0]; product.state.color = null;
    let vals = product.renderVals();
    if (p.colors) { vals.agregar(); assert.equal(car.totalUnidades(), 0); vals.colores[0].select(); vals = product.renderVals(); }
    vals.agregar(); assert.equal(car.totalUnidades(), 1);
    assert.equal(car.leer()[0].talla, p.sizes[0]); car.vaciar();
  }
  product.car = { agregar: () => { throw new Error('storage blocked'); } };
  product.renderVals().agregar(); assert.equal(product.state.notiTitulo, 'No pudimos guardar el pedido');
  product.componentWillUnmount();
  const cart = components['adelantao-carrito.dc.html']; cart.car = car;
  cart.state.listo = true; cart.state.items = []; assert.equal(cart.renderVals().vacio, true);
  car.agregar(item); cart.sync(); assert.equal(cart.renderVals().unidades, 2);
  assert.equal(new URL(cart.renderVals().enlace).searchParams.get('text'), car.mensajeWhatsApp(car.leer()));
  cart.modificar(() => { throw new Error('storage blocked'); }); assert.match(cart.renderVals().errorPedido, /No pudimos/);
  for (const file of ['adelantao-zapatos.dc.html', 'adelantao-chancletas.dc.html']) {
    const c = components[file]; c.lst = lst; c.state.list = file.includes('chancletas') ? cat.chanclas : cat.zapatos;
    assert.equal(c.renderVals().shoes.length, c.state.list.length);
    c.renderVals().buscar({ target: { value: 'zzzinexistente' } }); assert.equal(c.renderVals().vacio, true);
  }
  for (const f of ['adelantao-ui.js', 'support.js']) new vm.Script(fs.readFileSync(f, 'utf8'));
  for (const f of fs.readdirSync('.').filter(f => f.endsWith('.json'))) JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`OK: ${cat.productos.length} productos, ${assets.size} imágenes, enlaces, filtros, selección, carrito y WhatsApp.`);
})().catch(e => { console.error(e); process.exitCode = 1; });

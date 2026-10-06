const assert = require('node:assert/strict');
const pause = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const targets = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json());
  const socket = new WebSocket(targets.find(t => t.url === 'about:blank' || t.url.startsWith('http://127.0.0.1:8765/')).webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open', r, { once: true }));
  let seq = 0; const pending = new Map(), errors = [];
  socket.addEventListener('message', e => {
    const message = JSON.parse(e.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise(resolve => { const id = ++seq; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.error && /context|navigat/i.test(r.error.message)) return false;
    if (r.error) throw new Error(r.error.message);
    if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };
  const wait = async expression => { for (let n = 0; n < 100; n++) { if (await evaluate('!!(' + expression + ')')) return; await pause(100); } throw new Error('Tiempo agotado: ' + expression); };
  const query = `const scope = document;`;
  const nav = async page => { await send('Page.navigate', { url: 'http://127.0.0.1:8765/' + page }); await wait(`(()=>{${query}return !scope.querySelector('x-dc') && scope.querySelector('h1');})()`); };
  try {
    await send('Runtime.enable'); await send('Page.enable');
    for (const width of [1440, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
      for (const page of ['adelantao-inicio.dc.html','adelantao-zapatos.dc.html','adelantao-chancletas.dc.html']) {
        await nav(page);
        await wait(`(()=>{${query}return scope.querySelectorAll('.at-product').length > 0;})()`);
        const result = await evaluate(`(()=>{${query}return {cards:scope.querySelectorAll('.at-product').length, overflow:document.documentElement.scrollWidth > innerWidth+1, broken:[...scope.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)};})()`);
        assert.equal(result.overflow, false, page + ' desborda ' + width); assert.deepEqual(result.broken, []);
        console.log(width, page, result.cards, 'tarjetas OK');
        if (page !== 'adelantao-inicio.dc.html') {
          await evaluate(`(()=>{${query}const field=scope.querySelector('input[type=search]');field.value='zzzinexistente';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
          await wait(`!!document.querySelector('.at-empty')`);
          await evaluate(`document.querySelector('.at-empty button').click()`);
          await wait(`document.querySelectorAll('.at-product').length === ${result.cards}`);
        }
      }
    }
    await nav('adelantao-producto.dc.html?p=adidas-adilette-comfort-7-colores');
    await wait(`(()=>{${query}return scope.querySelectorAll('.at-swatch').length===7;})()`);
    await evaluate(`(()=>{${query}scope.querySelector('.at-swatch').click();})()`); await pause(200);
    await evaluate(`(()=>{${query}[...scope.querySelectorAll('button')].find(b=>b.textContent.includes('Añadir al pedido')).click();})()`);
    await nav('adelantao-carrito.dc.html');
    await wait(`(()=>{${query}return scope.querySelector('.at-line');})()`);
    const order = await evaluate(`(()=>{${query}return {href:scope.querySelector('.at-summary a').href,text:scope.querySelector('textarea').value};})()`);
    assert.equal(new URL(order.href).searchParams.get('text'), order.text);
    assert.match(order.text, /Azul rey/);
    await evaluate(`document.querySelector('.at-qty button:last-child').click()`);
    await wait(`document.querySelector('textarea').value.includes('cantidad 2')`);
    await evaluate(`(()=>{const key='adelantao-zapatos-carrito';const items=JSON.parse(localStorage.getItem(key));items[0].cantidad=3;localStorage.setItem(key,JSON.stringify(items));window.dispatchEvent(new StorageEvent('storage',{key}));})()`);
    await wait(`document.querySelector('textarea').value.includes('cantidad 3')`);
    await evaluate(`(()=>{${query}scope.querySelector('.at-clear').click();})()`);
    await wait(`(()=>{${query}return !!scope.querySelector('.at-empty-cart');})()`);
    assert.deepEqual(errors, []);
    console.log('OK: navegador, móvil/escritorio, color, añadir, WhatsApp, vaciar y sin excepciones.');
  } finally { socket.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

// Scorrimento col dito (tocco emulato) nella galleria della Scheda e nel visore di VIS-0142.
const { scenario } = require(__dirname + '/../../../../prova/lib.cjs');
const { textOf, clickAt } = require(__dirname + '/../../../../prova/a1-util.cjs');
const heroLeft = (page) => page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.scrollWidth > d.clientWidth + 10 && ['auto', 'scroll'].includes(getComputedStyle(d).overflowX)).map((d) => Math.round(d.scrollLeft)));
(async () => {
  await scenario('gal-dito', async (h) => {
    const { page } = h;
    await page.getByText('VIS-0142', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const swipe = async (x0, x1, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
      for (let i = 1; i <= 10; i += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(1200);
    };
    const out = {};
    await swipe(320, 40, 160);
    out.schedaDopoDito = { left: await heroLeft(page), contatore: await textOf(page, /^\d\/3$/) };
    try {
      await cdp.send('Input.synthesizeScrollGesture', { x: 300, y: 160, xDistance: -300, yDistance: 0, gestureSourceType: 'touch', speed: 1200 });
      await page.waitForTimeout(1200);
      out.schedaDopoGesto = { left: await heroLeft(page), contatore: await textOf(page, /^\d\/3$/) };
    } catch (e) { out.schedaDopoGesto = 'non concludente: ' + e.message.slice(0, 80); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 188, y: 160 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(1500);
    if (!(await textOf(page, /^\d \/ 3$/))) await clickAt(page, 188, 160, 1500);
    out.visoreAperto = await textOf(page, /^\d \/ 3$/);
    await swipe(320, 40, 400);
    out.visoreDopoDito = { left: await heroLeft(page), contatore: await textOf(page, /^\d \/ 3$/) };
    await h.shot('dopo');
    return out;
  });
})();

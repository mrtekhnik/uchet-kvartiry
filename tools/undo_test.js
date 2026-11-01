const {chromium}=require('playwright');let f=0;const ok=(c,m)=>{console.log(c?'  ok  ':'  FAIL',m);if(!c)f++;};
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});
const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});
const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8780/index.html');
const gp=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('utilityTrackerData_v1')).monthly['2026-06'].gasPayment);
const vis=sel=>p.evaluate(s=>getComputedStyle(document.querySelector(s)).display!=='none',sel);
await p.click('[data-tab=input]');await p.fill('#inputMonth','2026-06');await p.dispatchEvent('#inputMonth','change');
const g0=await gp();
for(const v of ['101','102','103']){ await p.fill('#f_gasPayment',v); await p.click('#saveMonthBtn'); await p.waitForTimeout(100); }
ok(await vis('#undoToast'),'плашка показана'); console.log('   ',await p.textContent('#undoToastMsg'));
ok(/шагов для отмены: 3/.test(await p.textContent('#undoToastMsg')),'помнит 3 шага');
ok(await vis('#undoHdrBtn'),'кнопка ↶ в шапке');
await p.click('#undoToastBtn'); ok(await gp()===102,'1-я отмена → 102');
await p.click('#undoToastBtn'); ok(await gp()===101,'2-я отмена → 101');
await p.click('#undoToastBtn'); ok(await gp()===g0,'3-я отмена → исходное '+g0);
ok(!(await vis('#undoToast')) && !(await vis('#undoHdrBtn')),'после всех шагов плашка и ↶ скрыты');
// авто-закрытие
await p.evaluate(()=>{const pr=JSON.parse(localStorage.getItem('utilityTrackerPrefs_v1')||'{}');pr.undoSec=2;localStorage.setItem('utilityTrackerPrefs_v1',JSON.stringify(pr));});
await p.reload();await p.click('[data-tab=input]');await p.fill('#inputMonth','2026-06');await p.dispatchEvent('#inputMonth','change');
await p.fill('#f_gasPayment','201');await p.click('#saveMonthBtn');await p.waitForTimeout(300);
ok(await vis('#undoToast'),'плашка есть сразу'); await p.waitForTimeout(2300);
ok(!(await vis('#undoToast')),'плашка закрылась сама через 2 с'); ok(await vis('#undoHdrBtn'),'↶ в шапке остался');
await p.click('#undoHdrBtn'); await p.waitForTimeout(100); ok(await vis('#undoToast'),'тап по ↶ показывает плашку');
await p.click('#undoToastBtn'); ok(await gp()===g0,'отмена из шапки работает');
// настройка в ⚙
await p.click('#gearBtn'); ok(await p.inputValue('#undoSecSel')==='2','настройка отображается'); await p.selectOption('#undoSecSel','0');
ok((await p.evaluate(()=>JSON.parse(localStorage.getItem('utilityTrackerPrefs_v1')).undoSec))===0,'«Не закрывать» сохраняется'); await p.click('#settingsClose');
// копирование
await p.fill('#f_gasReading','9500');await p.fill('#f_elReading','11600');await p.click('#saveMonthBtn');await p.waitForTimeout(200);
ok(await vis('#copyCard'),'блок копирования показан');
const chips=await p.$$eval('.copy-chip',els=>els.map(e=>e.getAttribute('data-copy')));console.log('   chips',chips);
await p.click('.copy-chip >> nth=0'); ok((await p.evaluate(()=>navigator.clipboard.readText()))==='9500','клик копирует газ: 9500');
await p.click('.copy-chip >> nth=1'); ok((await p.evaluate(()=>navigator.clipboard.readText()))==='11600','клик копирует свет: 11600');
await p.screenshot({path:'/tmp/copy.png'});
ok(p.errs.length===0,'нет ошибок JS '+p.errs.join());
await b.close();console.log('fails',f);})();

const {chromium}=require('playwright');const {spawn,execSync}=require('child_process');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let f=0;const ok=(c,m)=>{console.log(c?'  ok  ':'  FAIL',m);if(!c)f++;};
(async()=>{ try{execSync('fuser -k 8771/tcp');}catch(e){} await sleep(300);
const mock=spawn('python3',['/home/claude/test/ghmock.py','8771'],{stdio:'ignore'}); await sleep(700);
const b=await chromium.launch({args:['--no-sandbox']});
const mk=async(cfg)=>{const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();p.on('dialog',d=>d.accept());p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.addInitScript(c=>{ if(!localStorage.getItem('__i')){localStorage.setItem('__i','1');localStorage.setItem('mrtekhnik.sync.api','http://127.0.0.1:8771');if(c)localStorage.setItem('mrtekhnik.sync',JSON.stringify({repo:'mrtekhnik/sync',token:'test-token'}));}},cfg);
 await p.goto('http://localhost:8780/index.html');return p;};
const dot=p=>p.evaluate(()=>document.getElementById('syncBtn').classList.contains('dirty'));
const tip=p=>p.evaluate(()=>document.getElementById('syncBtn').title);
let p=await mk(false); ok(!(await dot(p)),'не подключено — точки нет'); await p.close();
p=await mk(true);
ok(await dot(p),'подключено, синхронизации не было — точка сразу'); ok(/несинхронизированные/.test(await tip(p)),'подсказка: '+await tip(p));
await p.click('#syncBtn'); await p.waitForTimeout(1500);
ok(!(await dot(p)),'после успешной синхронизации точки нет'); ok(await tip(p)==='Синхронизировать','подсказка: '+await tip(p));
// просмотр/настройки/экспорт не включают
await p.click('[data-tab=ref]'); await p.click('#gearBtn'); await p.click('[data-font="1.15"]'); await p.click('#settingsClose'); await p.click('[data-tab=main]');
ok(!(await dot(p)),'просмотр и смена настроек вида — точки нет');
// изменение, задержка 1 ч по умолчанию
await p.click('[data-tab=input]'); await p.fill('#inputMonth','2026-06'); await p.dispatchEvent('#inputMonth','change'); await p.fill('#f_gasPayment','555'); await p.click('#saveMonthBtn'); await p.waitForTimeout(200);
ok(!(await dot(p)),'изменение есть, 1 ч не прошёл — точки нет');
const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('utilityTrackerSync_v1')));ok(st.dirtySince>0,'момент первого изменения записан');
// «Сразу»
await p.click('#gearBtn'); await p.selectOption('#syDelay','0'); await p.click('#settingsClose');
ok(await dot(p),'задержка «Сразу» — точка есть');
await p.click('#syncBtn'); await p.waitForTimeout(1500); ok(!(await dot(p)),'после синхронизации исчезла');
// таймер: задержка 2 с
await p.evaluate(()=>{const pr=JSON.parse(localStorage.getItem('utilityTrackerPrefs_v1')||'{}');pr.syncDelay=2000;localStorage.setItem('utilityTrackerPrefs_v1',JSON.stringify(pr));});
await p.reload(); await p.click('[data-tab=input]'); await p.fill('#inputMonth','2026-06'); await p.dispatchEvent('#inputMonth','change'); await p.fill('#f_gasPayment','556'); await p.click('#saveMonthBtn'); await p.waitForTimeout(300);
ok(!(await dot(p)),'до истечения задержки точки нет'); await p.waitForTimeout(2300); ok(await dot(p),'точка появилась сама по таймеру');
// удаление в корзину / «Отменить» тоже считаются; после синхронизации исчезает
await p.click('#syncBtn'); await p.waitForTimeout(1500); ok(!(await dot(p)),'исчезла после синхронизации');
// изменение с другого устройства не показывается
const q=await mk(true); await q.click('#syncBtn'); await q.waitForTimeout(1500); await q.click('#conflictLater').catch(()=>{});
await q.click('[data-tab=input]'); await q.fill('#inputMonth','2026-06'); await q.dispatchEvent('#inputMonth','change'); await q.fill('#f_gasPayment','999'); await q.click('#saveMonthBtn'); await q.waitForTimeout(300);
await q.evaluate(()=>{const pr={syncDelay:0};localStorage.setItem('utilityTrackerPrefs_v1',JSON.stringify(pr));}); await q.reload(); await q.click('#syncBtn'); await q.waitForTimeout(1500);
await sleep(300); ok(!(await dot(p)),'правка на другом устройстве точку не включает');
ok(p.errs.length+q.errs.length===0,'нет ошибок JS');
await b.close();mock.kill();console.log('fails',f);})();

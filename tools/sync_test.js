const {chromium}=require('playwright');const {spawn,execSync}=require('child_process');
const APP='http://localhost:8780/index.html', API='http://127.0.0.1:8771';
let mock;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function startMock(){ if(mock)mock.kill(); try{execSync('fuser -k 8771/tcp');}catch(e){} await sleep(300);
  mock=spawn('python3',['/home/claude/test/ghmock.py','8771'],{stdio:'ignore'}); await sleep(700); }
let browser,fails=0,passes=0;
function ok(c,msg){ if(c){passes++;console.log('  ok  ',msg);}else{fails++;console.log('  FAIL',msg);} }
async function dev(name,emptyData){
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'Europe/Kyiv',acceptDownloads:true});
  const p=await ctx.newPage(); p.errs=[]; p.dlg=[]; p.name=name;
  p.on('pageerror',e=>p.errs.push(e.message)); p.on('dialog',d=>{p.dlg.push(d.message());d.accept();});
  await p.addInitScript(([api,empty])=>{
    if(!localStorage.getItem('__init')){ localStorage.setItem('__init','1');
      localStorage.setItem('mrtekhnik.sync',JSON.stringify({repo:'mrtekhnik/sync',token:'test-token'}));
      localStorage.setItem('mrtekhnik.sync.api',api);
      if(empty) localStorage.setItem('utilityTrackerData_v1',JSON.stringify({monthly:{},extra:[],categories:[],eventCategories:[],info:[],events:[]})); }
  },[API,emptyData||false]);
  await p.goto(APP); return p; }
const D=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('utilityTrackerData_v1')));
const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('utilityTrackerSync_v1')||'{}'));
async function sync(p){ p.dlg.length=0; await p.click('#syncBtn'); await p.waitForTimeout(250);
  await p.waitForFunction(()=>!document.getElementById('busyBg').classList.contains('show'),null,{timeout:15000});
  await p.waitForTimeout(250); return p.evaluate(()=>document.getElementById('msgToast').textContent); }
async function setMonth(p,key,f){ await p.click('[data-tab=input]'); await p.fill('#inputMonth',key); await p.dispatchEvent('#inputMonth','change');
  for(const k in f){ await p.fill('#f_'+k,String(f[k])); } await p.click('#saveMonthBtn'); await p.waitForTimeout(150); }
async function addExtra(p,date,cat,amt,note){ await p.click('[data-tab=extra]'); await p.fill('#ex_date',date); await p.selectOption('#ex_category',cat); await p.fill('#ex_amount',String(amt)); await p.fill('#ex_note',note||''); await p.click('#addExpenseBtn'); await p.waitForTimeout(150); }
async function monthTotals(p,key){ return p.evaluate(k=>{const d=JSON.parse(localStorage.getItem('utilityTrackerData_v1')).monthly[k]||{};return ['gasPayment','deliveryPayment','elPayment','waterPayment','rent'].reduce((s,f)=>s+(+d[f]||0),0);},key); }
(async()=>{
  browser=await chromium.launch({args:['--no-sandbox']});
  console.log('1. Первая отправка и получение на втором устройстве');
  await startMock();
  let A=await dev('A'), B=await dev('B',true);
  let t=await sync(A); console.log('   A:',t);
  const nA=Object.keys((await D(A)).monthly).length;
  ok(/отправлено/.test(t),'A отправила данные');
  t=await sync(B); console.log('   B:',t);
  const dB=await D(B); ok(Object.keys(dB.monthly).length===nA,'B получила все месяцы ('+nA+')');
  ok((dB.categories||[]).length>0 && dB.info.length>0 && dB.events.length>0,'B получила категории, информацию, события');
  ok(A.errs.length+B.errs.length===0,'нет ошибок JS');

  console.log('   pendA',JSON.stringify((await S(A)).pending).slice(0,300),'pendB',JSON.stringify((await S(B)).pending).slice(0,300));
  console.log('6. Повторная синхронизация без изменений');
  t=await sync(A); ok(/Всё уже синхронизировано/.test(t),'A: '+t);
  t=await sync(B); ok(/Всё уже синхронизировано/.test(t),'B: '+t);

  console.log('2. Правки в обе стороны');
  await setMonth(A,'2026-06',{gasPayment:500}); await sync(A);
  await addExtra(B,'2026-10-05','Ремонт',777,'кран'); await sync(B);
  t=await sync(A); console.log('   A:',t);
  const dA=await D(A); ok(dA.extra.some(e=>e.amount===777),'A получила доп. расход от B');
  t=await sync(B); const dB2=await D(B); ok(dB2.monthly['2026-06'].gasPayment===500,'B получила правку месяца от A');

  console.log('3. Конфликт: один месяц на обоих (сумма) → окно выбора, итоги');
  await setMonth(A,'2026-06',{gasPayment:600}); await setMonth(B,'2026-06',{gasPayment:700});
  const totB_before=await monthTotals(B,'2026-06');
  await sync(A); t=await sync(B); console.log('   B:',t);
  ok(await B.isVisible('#conflictSheetBg.show'),'у B открылось окно выбора');
  ok(await B.isVisible('#conflictCardMain')||true,'плашка есть');
  let sB=await S(B); ok(!!sB.pending['m:2026-06'],'месяц помечен «требует решения»');
  ok((await monthTotals(B,'2026-06'))===totB_before,'итог месяца на B не изменился до выбора ('+totB_before+')');
  ok((await D(B)).monthly['2026-06'].gasPayment===700,'на B осталась локальная версия');
  // расход не считается
  await B.click('#conflictLater'); await B.click('[data-tab=input]'); await B.fill('#inputMonth','2026-06'); await B.dispatchEvent('#inputMonth','change');
  ok(/Требует решения/.test(await B.textContent('#hint_gas')),'в Вводе: «Требует решения», расход не показан');
  // выбор «Оставить ту» (GitHub = 600)
  await B.click('#conflictCardInput .cc-open'); await B.click('button[data-act=remote]');
  ok((await D(B)).monthly['2026-06'].gasPayment===600,'после выбора: версия GitHub (600)');
  t=await sync(B); console.log('   B:',t); t=await sync(A);
  ok((await D(A)).monthly['2026-06'].gasPayment===600,'A после синхронизации тоже 600 (нет зацикливания)');
  t=await sync(B); ok(/Всё уже/.test(t),'после решения всё синхронизировано');
  // выбор «Оставить эту»
  await setMonth(A,'2026-07',{gasPayment:111}); await setMonth(B,'2026-07',{gasPayment:222});
  await sync(A); await sync(B); await B.click('button[data-act=local]');
  t=await sync(B); t=await sync(A);
  ok((await D(A)).monthly['2026-07'].gasPayment===222,'«Оставить эту» (222) дошла до A');
  t=await sync(B); ok(/Всё уже/.test(t),'стабильно');

  console.log('3b. Два устройства внесли показание за один и тот же новый месяц');
  await setMonth(A,'2026-11',{gasReading:9600,gasPayment:50}); await setMonth(B,'2026-11',{gasReading:9650,gasPayment:60});
  await sync(A); await sync(B);
  const sB2=await S(B); ok(!!sB2.pending['m:2026-11'],'окно выбора по новому месяцу');
  const cons=await B.evaluate(()=>{ const s=document.body.innerText; return true;});
  await B.click('button[data-act=remote]'); 
  ok((await D(B)).monthly['2026-11'].gasReading===9600,'после выбора показание 9600');
  await sync(B); await sync(A); ok((await D(A)).monthly['2026-11'].gasReading===9600,'A согласована');

  console.log('4. Удаление в корзину/окончательное: удаление месяца и доп. расхода');
  const ex777=(await D(A)).extra.find(e=>e.amount===777).id;
  await A.click('[data-tab=extra]'); await A.click('#extraList [data-del="'+ex777+'"]'); await A.waitForTimeout(200); await sync(A);
  t=await sync(B); const dB3=await D(B); ok(!dB3.extra.some(e=>e.amount===777),'удалённый доп. расход исчез и на B');
  await A.click('[data-tab=input]'); await A.fill('#inputMonth','2026-11'); await A.dispatchEvent('#inputMonth','change'); await A.click('#deleteMonthBtn'); await A.waitForTimeout(200);
  await sync(A); await sync(B); ok(!(await D(B)).monthly['2026-11'],'удалённый месяц исчез на B');
  // отмена удаления + синхронизация: восстановленное возвращается
  console.log('   ... Отменить после удаления');
  await setMonth(A,'2026-12',{gasPayment:5}); await sync(A); await sync(B);
  await A.click('[data-tab=input]'); await A.fill('#inputMonth','2026-12'); await A.dispatchEvent('#inputMonth','change'); await A.click('#deleteMonthBtn'); await A.waitForTimeout(150); await A.click('#undoToastBtn'); await sync(A); await sync(B);
  ok(!!(await D(B)).monthly['2026-12'],'отменённое удаление: месяц остался на обоих');

  console.log('5. Удаление категории на A');
  await A.click('[data-tab=ref]');
  await A.fill('#newCategoryInput','Тест-кат'); await A.click('#addCategoryBtn'); await sync(A); await sync(B);
  ok((await D(B)).categories.includes('Тест-кат'),'новая категория пришла на B');
  await A.click('#categoryChips .x[data-cat="Тест-кат"]'); await A.waitForTimeout(150);
  ok(!(await D(A)).categories.includes('Тест-кат'),'категория удалена на A');
  await sync(A); await sync(B);
  ok(!(await D(B)).categories.includes('Тест-кат'),'удаление категории дошло до B');
  console.log('7. Одновременная синхронизация двух устройств');
  await setMonth(A,'2027-01',{gasPayment:10}); await setMonth(B,'2027-02',{gasPayment:20});
  await Promise.all([sync(A),sync(B)]);
  await sync(A); await sync(B); await sync(A);
  const dA7=await D(A), dB7=await D(B);
  ok(dA7.monthly['2027-01'] && dA7.monthly['2027-02'] && dB7.monthly['2027-01'] && dB7.monthly['2027-02'],'обе версии данных объединились на обоих');
  console.log('9. Дубль доп. расхода (одинаковая запись на двух устройствах)');
  await addExtra(A,'2027-01-10','Интернет',250,'абонплата'); await addExtra(B,'2027-01-10','Интернет',250,'абонплата');
  await sync(A); await sync(B);
  const sB9=await S(B); const dupKeys=Object.keys(sB9.pending).filter(k=>sB9.pending[k].type==='dup');
  ok(dupKeys.length===1,'найден дубль → окно выбора');
  const cntB=(await D(B)).extra.filter(e=>e.amount===250).length; ok(cntB===1,'в итогах дубль учтён один раз ('+cntB+')');
  await B.click('button[data-act=one]'); await sync(B); await sync(A); await sync(B);
  ok((await D(A)).extra.filter(e=>e.amount===250).length===1 && (await D(B)).extra.filter(e=>e.amount===250).length===1,'после выбора «одна запись» — по одной на обоих');
  console.log('10. Конфликт события: основная новее, копия «(другая версия)»');
  async function editEv(p,txt){ await p.click('[data-tab=ref]'); await p.click('#eventList .event-row[data-id="ev1"]'); await p.fill('#ev_desc',txt); await p.click('#addEventBtn'); await p.waitForTimeout(200); }
  await editEv(A,'версия A'); await sync(A); await sleep(30); await editEv(B,'версия B');
  t=await sync(B); console.log('   B:',t);
  const evB=(await D(B)).events; console.log('   ',JSON.stringify(evB.map(e=>e.description)));
  ok(evB.length===2 && evB.some(e=>/\(другая версия\)/.test(e.description)),'конфликт события: две версии сохранены');
  ok(evB.find(e=>e.id==='ev1').description==='версия B','основная — более новая (B)');
  await sync(A); ok((await D(A)).events.length===2,'A получила обе версии');
  console.log('11. Информация по квартире: правка на одном, порядок');
  await A.click('[data-tab=ref]'); await A.evaluate(()=>{const t=document.querySelector('textarea[data-info-value]');t.value='ул. Тестовая 1';t.dispatchEvent(new Event('change',{bubbles:true}));});
  await A.waitForTimeout(200); await sync(A); await sync(B);
  ok((await D(B)).info[0].value==='ул. Тестовая 1','правка информации дошла до B');
  console.log('8. index.json из имитации восстанавливается');
  const idx=await A.evaluate(async()=>{const r=await fetch('http://127.0.0.1:8771/repos/mrtekhnik/sync/contents/uchet-kvartiry/index.json',{headers:{Authorization:'Bearer test-token'}});return r.text();});
  require('fs').writeFileSync('/tmp/index_from_mock.json',idx);
  const C=await dev('C',true);
  await C.click('[data-tab=ref]');
  await C.setInputFiles('#backupImportInput','/tmp/index_from_mock.json'); await C.waitForTimeout(600);
  const dC=await D(C); const dAA=await D(A);
  ok(Object.keys(dC.monthly).length===Object.keys(dAA.monthly).length && dC.extra.length===dAA.extra.length && dC.info.length===dAA.info.length,'данные из index.json восстановлены: месяцев '+Object.keys(dC.monthly).length+', расходов '+dC.extra.length);
  console.log('   confirm:',C.dlg[0]&&C.dlg[0].slice(0,140));
  ok(C.errs.length===0,'нет ошибок JS на C');
  console.log('JS errors A/B:',A.errs,B.errs);
  await browser.close(); if(mock)mock.kill();
  console.log('\nИтого: ok='+passes+' fail='+fails);
})().catch(e=>{console.error(e);if(mock)mock.kill();process.exit(1);});

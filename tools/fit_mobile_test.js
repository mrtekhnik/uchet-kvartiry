const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});
for(const h of [851,760,700]){
for(const f of ['1','1.15']){
const ctx=await b.newContext({viewport:{width:393,height:h},deviceScaleFactor:2.75,isMobile:true,hasTouch:true,serviceWorkers:'block',userAgent:'Mozilla/5.0 (Linux; Android 12; M2007J20CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'});const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(v=>{if(!localStorage.getItem('__i')){localStorage.setItem('__i','1');localStorage.setItem('utilityTrackerPrefs_v1',JSON.stringify({font:v}));}},f);
await p.goto('file:///home/claude/uchet-kvartiry/index.html');await p.tap('[data-tab=input]');
await p.fill('#inputMonth','2026-06');await p.dispatchEvent('#inputMonth','change');await p.waitForTimeout(400);
console.log('h',h,'font',f,JSON.stringify(await p.evaluate(()=>({inner:innerHeight,w:innerWidth,zoom:document.getElementById('inputCard').style.zoom,saveBottom:Math.round(document.getElementById('saveMonthBtn').getBoundingClientRect().bottom),tab:Math.round(document.querySelector('nav.tabbar').getBoundingClientRect().top)}))));
if(h===700&&f==='1.15')await p.screenshot({path:'/tmp/poco.png'});
await ctx.close();}}
await b.close();})();

const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--no-sandbox']});
for(const [f,fit] of [['1',true],['1.15',true],['1.3',true],['1.3',false]]){
const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.addInitScript(([v,ft])=>{if(!localStorage.getItem('__i')){localStorage.setItem('__i','1');localStorage.setItem('utilityTrackerPrefs_v1',JSON.stringify({font:v,fitInput:ft}));}},[f,fit]);
await p.goto('file:///home/claude/uchet-kvartiry/index.html');await p.click('[data-tab=input]');
await p.fill('#inputMonth','2026-06');await p.dispatchEvent('#inputMonth','change');await p.waitForTimeout(300);
console.log('font',f,'fit',fit,await p.evaluate(()=>({zoom:document.getElementById('inputCard').style.zoom,saveBottom:Math.round(document.getElementById('saveMonthBtn').getBoundingClientRect().bottom),tab:Math.round(document.querySelector('nav.tabbar').getBoundingClientRect().top),ox:document.documentElement.scrollWidth>innerWidth})));
if(f==='1.3'&&fit)await p.screenshot({path:'/tmp/in6.png'});
await ctx.close();}
await b.close();})();

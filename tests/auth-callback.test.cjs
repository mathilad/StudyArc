const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const script=fs.readFileSync('docs/auth-callback.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
async function run({mobile=false,error=false,verified=true}={}){
 const nodes={},timers=new Map(),listeners={};let n=0;
 const location={search:'?target=account-created&auth_flow=signup',hash:error?'#error_description=Link%20expired':'#access_token=test-token',pathname:'/auth-callback.html',replace(url){this.redirect=url}};
 const document={hidden:false,getElementById(id){return nodes[id]??={textContent:'',addEventListener(){}}},addEventListener(type,fn){listeners[type]=fn}};
 const context={URL,URLSearchParams,AbortSignal,document,location,history:{replaceState(){}},navigator:{userAgent:mobile?'Android':'Desktop'},setTimeout(fn){timers.set(++n,fn);return n},clearTimeout(id){timers.delete(id)},fetch:async url=>url.includes('/auth/v1/user')?{ok:verified,json:async()=>({email_confirmed_at:verified?'2026-09-16':null})}:{ok:true,json:async()=>[{key:'signup_app_url',value:'studyarc://login'},{key:'signup_web_url',value:'https://example.com/login'}]}};
 await vm.runInNewContext(script,context);return{nodes,timers,document,listeners,location};
}
test('desktop confirms account and forwards to configured website without tokens',async()=>{const x=await run();assert.equal(x.nodes.title.textContent,'Account created successfully');for(const fn of x.timers.values())fn();assert.equal(x.location.redirect,'https://example.com/login?account_created=1');assert(!x.nodes.webButton.href.includes('token'));});
test('failed mobile handoff falls back to website',async()=>{const x=await run({mobile:true});assert.equal(x.location.href,'studyarc://login?account_created=1');for(const fn of x.timers.values())fn();assert.equal(x.location.redirect,'https://example.com/login?account_created=1');});
test('successful mobile handoff cancels fallback when browser hides',async()=>{const x=await run({mobile:true});x.document.hidden=true;x.listeners.visibilitychange();assert.equal(x.timers.size,0);});
test('expired link does not claim success or redirect',async()=>{const x=await run({error:true});assert.equal(x.nodes.title.textContent,'This email link could not be completed');assert.equal(x.timers.size,0);});
test('unverified token does not claim success',async()=>{const x=await run({verified:false});assert.equal(x.nodes.title.textContent,'Unable to verify email');assert.equal(x.timers.size,0);});

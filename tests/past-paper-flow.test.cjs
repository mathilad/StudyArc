const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(path,require){const ctx={exports:{},require,Date,Set,Map,Error};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.exports}
const tracker=load('lib/pastPaperTracker.ts',()=>({default:{}}));
const ui=load('lib/pastPaperUi.ts',()=>tracker);
test('full papers retain section identities, including overlapping science question numbers',()=>{
 for(const subject of ['Pure Mathematics','Applied Mathematics']){
  const full=tracker.trackerQuestions(subject,2025,'Full Paper');assert.equal(full.length,17);assert.equal(full.filter(q=>q.kind==='Part A').length,10);assert.equal(full.filter(q=>q.kind==='Part B').length,7);
 }
 for(const subject of ['Physics','Chemistry']){
  const full=tracker.trackerQuestions(subject,2025,'Full Paper');assert.equal(full.length,60);assert.equal(new Set(full.map(q=>q.kind+':'+q.itemKey)).size,60);assert.equal(tracker.trackerQuestions(subject,2025,'Structured').length,4);assert.equal(tracker.trackerQuestions(subject,2025,'Essay').length,6);
 }
 assert.equal(tracker.trackerQuestions('Physics',1999,'Full Paper').length,72);
 assert.equal(tracker.trackerQuestions('Pure Mathematics',1999,'Full Paper').length,10);
 assert.equal(tracker.trackerQuestions('Applied Mathematics',1999,'Full Paper').length,12);
});
test('completion counts each question once, respects ranges, and changes after undo',()=>{
 const ticks=[['Pure Mathematics',2025,'Part A','1'],['Pure Mathematics',2025,'Part A','1'],['Pure Mathematics',2024,'Part A','2']];
 const done=(...key)=>ticks.some(t=>t.join(':')===key.join(':'));
 let p=ui.subjectProgress('Pure Mathematics',{from:2025,to:2025},done);assert.equal(p.total,17);assert.equal(p.done,1);
 ticks.pop();ticks.pop();p=ui.subjectProgress('Pure Mathematics',{from:2025,to:2025},done);assert.equal(p.done,1);
 ticks.pop();assert.equal(ui.subjectProgress('Pure Mathematics',{from:2025,to:2025},done).done,0);
});
function harness(provider){
 const values=[];let cursor=0;const react={useState(init){const i=cursor++;if(!(i in values))values[i]=typeof init==='function'?init():init;return [values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v}]},useRef(init){const i=cursor++;if(!(i in values))values[i]={current:init};return values[i]}};
 const {usePastPaperEntry}=load('hooks/usePastPaperEntry.ts',name=>name==='react'?react:{usePastPaperTracker:()=>provider});
 return ()=>{cursor=0;return usePastPaperEntry('Pure Mathematics')};
}
test('Undo removes only newly saved server IDs and preserves previous attempts',async()=>{
 const saved=['older'];let serial=0;
 const render=harness({loading:false,addAttempt:async()=>{const id='server-'+(++serial);saved.push(id);return id},removeAttempt:async id=>saved.splice(saved.indexOf(id),1)});
 let entry=render();assert.equal(await entry.save(2025,tracker.trackerQuestions('Pure Mathematics',2025,'Part A').slice(0,3)),true);
 entry=render();assert.equal(entry.canUndo,true);assert.equal(await entry.undo(),true);assert.deepEqual(saved,['older']);assert.equal(render().canUndo,false);
});
test('partial save exposes errors and keeps successful saves undoable',async()=>{
 const saved=[];let serial=0;
 const render=harness({loading:false,addAttempt:async()=>{if(++serial===2)throw Error('Network failure');const id='server-'+serial;saved.push(id);return id},removeAttempt:async id=>saved.splice(saved.indexOf(id),1)});
 let entry=render();const recorded=[];assert.equal(await entry.save(2025,tracker.trackerQuestions('Pure Mathematics',2025,'Part A').slice(0,3),q=>recorded.push(q.itemKey)),false);
 assert.deepEqual(recorded,['1']);entry=render();assert.match(entry.error,/Network failure/);assert.equal(entry.canUndo,true);assert.equal(await entry.undo(),true);assert.deepEqual(saved,[]);
});
test('rapid repeated submissions are ignored while the first save is pending',async()=>{
 let resolve;let calls=0;const render=harness({loading:false,addAttempt:()=>{calls++;return new Promise(r=>resolve=r)},removeAttempt:async()=>{}});
 const entry=render(),q=tracker.trackerQuestions('Pure Mathematics',2025,'Part A').slice(0,1);const first=entry.save(2025,q);assert.equal(await entry.save(2025,q),false);assert.equal(calls,1);resolve('server-id');assert.equal(await first,true);
});

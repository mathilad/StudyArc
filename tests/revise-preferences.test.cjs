const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function setup(){
 const storage=new Map();let fail=false;
 const api={getItem:async key=>storage.get(key)??null,setItem:async(key,value)=>{if(fail)throw Error('Disk full');storage.set(key,value)}};
 const context={exports:{},require(name){if(name.includes('async-storage'))return{default:api};if(name.includes('subjects'))return{findTopic:(subject,title)=>({id:title==='Renamed lesson'?'lesson-1':title==='First lesson'?'lesson-1':title})};throw Error(name)}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/revisePreferences.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return{...context.exports,storage,setFailure:value=>{fail=value}};
}
test('excluding one lesson keeps its siblings and other subjects available',()=>{const p=setup();p.setRuntimeReviseExcludedLessons([p.reviseLessonKey('Physics','First lesson')]);assert(p.isLessonExcludedFromRevise('Physics','First lesson'));assert(!p.isLessonExcludedFromRevise('Physics','Second lesson'));assert(!p.isLessonExcludedFromRevise('Chemistry','First lesson'));p.setRuntimeReviseExcludedLessons([]);assert(!p.isLessonExcludedFromRevise('Physics','First lesson'));});
test('stable catalogue ID preserves a choice after lesson rename',()=>{const p=setup();assert.equal(p.reviseLessonKey('Physics','First lesson'),p.reviseLessonKey('Physics','Renamed lesson'));});
test('choices persist independently for each account; legacy subject switches do not hide subjects',async()=>{const p=setup();p.storage.set('@study-arc/revise-excluded-subjects/v1','["Physics"]');const key=p.reviseLessonKey('Physics','First lesson');await p.saveReviseExcludedLessons('user-a',[key]);assert.deepEqual(Array.from(await p.loadReviseExcludedLessons('user-a')),[key]);assert.deepEqual(Array.from(await p.loadReviseExcludedLessons('user-b')),[]);});
test('failed save leaves persisted choices intact',async()=>{const p=setup();await p.saveReviseExcludedLessons('user-a',['old']);p.setFailure(true);await assert.rejects(p.saveReviseExcludedLessons('user-a',['new']));assert.deepEqual(Array.from(await p.loadReviseExcludedLessons('user-a')),['old']);});

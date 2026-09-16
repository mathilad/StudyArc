const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const context={exports:{},require(name){if(name==='../data/subjects')return{SUBJECTS:{}};throw Error(name)}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/intelligence.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const calculate=context.exports.adaptiveBreakMinutes;
test('brief sessions never trigger a five-minute recovery, even with low ratings',()=>{
 for(const minutes of [0,1/60,1,4.99])for(const rating of [null,1,3,5])assert.equal(calculate(minutes,rating,rating),0);
 assert.equal(calculate(5,null,null),1);
});
test('normal sessions get proportionate recovery with neutral missing ratings',()=>{
 for(const [minutes,expected] of [[10,1],[25,3],[50,5],[60,6],[120,12]]){
  assert.equal(calculate(minutes,null,null),expected);
  assert.equal(calculate(minutes,3,3),expected);
 }
});
test('low energy and focus add modest recovery without exceeding the cap',()=>{
 assert(calculate(50,1,1)>calculate(50,3,3));
 let previous=0;
 for(let minutes=0;minutes<=300;minutes++){
  const result=calculate(minutes,1,1);
  assert(result>=previous&&result<=20);
  previous=result;
 }
});
test('invalid durations cannot produce invalid recovery suggestions',()=>{
 for(const minutes of [-1,NaN,Infinity])assert.equal(calculate(minutes,null,null),0);
 assert.equal(calculate(50,NaN,Infinity),5);
});

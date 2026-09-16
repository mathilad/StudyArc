const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/manualPaper.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {validateManualPaper:validate,matchesManualPaper:matches}=context.exports;
test('accepts whole papers without duration or marks and zero-mark questions',()=>{
 assert.equal(validate('2025-02-28','2024','','','','','General',false),null);
 assert.equal(validate('2025-02-28','2024','1','0','10','5(a)','Vectors',true),null);
});
test('rejects missing lessons, invalid dates, future dates and invalid scores',()=>{
 for(const args of [
 ['2025-02-30','2024','','','','','General',false],
 ['2999-01-01','2024','','','','','General',false],
 ['2025-02-28','2024','','11','10','5','Vectors',true],
 ['2025-02-28','2024','','','10','5','Vectors',true],
 ['2025-02-28','2024','','1','0','5','Vectors',true],
 ['2025-02-28','2024','-1','','','5','Vectors',true],
 ['2025-02-28','2024','','','','5','General',true],
 ['2025-02-28','2024','','','','','Vectors',true],
 ])assert.equal(typeof validate(...args),'string');
});
test('repeat identity distinguishes section, lesson and question without merging attempts',()=>{
 const first={id:'one',studyType:'Past Papers',subjectName:'Pure Mathematics',paperYear:2024,paperSection:'Part A',topicName:'Vectors',manualPaper:{questionNo:'5(a)',marksAwarded:2,marksTotal:5}};
 const second={...first,id:'two',manualPaper:{...first.manualPaper,marksAwarded:4}};
 const args=['Pure Mathematics',2024,'Part A','Vectors','5(a)'];
 assert.equal([first,second].filter(x=>matches(x,...args)).length,2);
 assert(!matches(first,'Pure Mathematics',2024,'Part B','Vectors','5(a)'));
 assert(!matches(first,'Pure Mathematics',2024,'Part A','Vectors','5(b)'));
 assert(!matches(first,'Pure Mathematics',2024,'Part A','General',null));
});

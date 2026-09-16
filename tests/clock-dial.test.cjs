const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/clockDial.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const pick=context.exports.clockDialValue;
test('dial supports every minute, not only five-minute marks',()=>{for(let n=0;n<60;n++){const a=n/60*Math.PI*2-Math.PI/2;assert.equal(pick(120+94*Math.cos(a),120+94*Math.sin(a),'minute'),n);}});
test('hour dial maps twelve at top and all hours clockwise',()=>{for(let n=1;n<=12;n++){const a=n/12*Math.PI*2-Math.PI/2;assert.equal(pick(120+94*Math.cos(a),120+94*Math.sin(a),'hour'),n);}});
test('center taps do not change the chosen time',()=>{assert.equal(pick(120,120,'hour'),null);assert.equal(pick(120,125,'minute'),null);});

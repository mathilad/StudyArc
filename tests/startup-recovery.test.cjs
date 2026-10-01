const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

test('native Android tombstones retain the crashing stack without other threads or memory dumps',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'studyarc-tombstone-'));
  const harness=`package com.studyarc.app;
import java.io.*;import java.nio.charset.StandardCharsets;
public class TombstoneTest {
 static byte[] v(long n){ByteArrayOutputStream b=new ByteArrayOutputStream();do{int x=(int)(n&127);n>>>=7;b.write(n==0?x:x|128);}while(n!=0);return b.toByteArray();}
 static byte[] join(byte[]... parts)throws Exception{ByteArrayOutputStream b=new ByteArrayOutputStream();for(byte[] p:parts)b.write(p);return b.toByteArray();}
 static byte[] num(int f,long n)throws Exception{return join(v(f*8),v(n));}
 static byte[] msg(int f,byte[] b)throws Exception{return join(v(f*8+2),v(b.length),b);}
 static byte[] text(int f,String s)throws Exception{return msg(f,s.getBytes(StandardCharsets.UTF_8));}
 public static void main(String[] args)throws Exception{
  byte[] frame=join(num(1,1234),text(4,"JavaTurboModule::call"),text(6,"libreactnative.so"),text(8,"build-id"));
  byte[] thread=join(text(2,"mqt_js"),msg(4,frame),msg(5,text(1,"PRIVATE-MEMORY")));
  byte[] other=join(text(2,"OTHER-THREAD"),msg(4,frame));
  byte[] fixture=join(num(6,42),text(14,"JNI stale reference"),msg(10,join(text(2,"SIGSEGV"),num(9,4))),msg(16,join(num(1,42),msg(2,thread))),msg(16,join(num(1,43),msg(2,other))));
  String s=StudyArcTombstone.format(fixture);
  if(!s.contains("JNI stale reference")||!s.contains("SIGSEGV")||!s.contains("JavaTurboModule::call")||!s.contains("libreactnative.so"))throw new AssertionError(s);
  if(s.contains("PRIVATE-MEMORY")||s.contains("OTHER-THREAD"))throw new AssertionError("Unrelated data exposed");
  try{StudyArcTombstone.format(new byte[]{18,127,1});throw new AssertionError("Malformed length accepted");}catch(IOException expected){}
  try{StudyArcTombstone.format(new byte[2*1024*1024+1]);throw new AssertionError("Unbounded trace accepted");}catch(IOException expected){}
  System.out.println("PASS");
 }
}`;
  fs.writeFileSync(path.join(tmp,'TombstoneTest.java'),harness);
  execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',tmp,'native/startup/StudyArcTombstone.java',path.join(tmp,'TombstoneTest.java')]);
  assert.match(execFileSync('java',['-cp',tmp,'com.studyarc.app.TombstoneTest'],{encoding:'utf8'}),/PASS/);
});

test('recovery gateway preserves app links and guards native loading; audio permission remains enabled',()=>{
  const vm=require('node:vm');let hooks={};
  const plugin=fs.readFileSync('plugins/withStartupRecovery.js','utf8');const sandbox={module:{exports:{}},__dirname:path.resolve('plugins'),require(name){
    if(name==='@expo/config-plugins')return {withAndroidManifest(c,f){hooks.manifest=f;return c},withMainApplication(c,f){hooks.application=f;return c},withDangerousMod(c){return c}};
    return require(name);
  }};
  vm.runInNewContext(plugin,sandbox);sandbox.module.exports({});
  const links=[{action:[{$:{'android:name':'android.intent.action.MAIN'}}]},{action:[{$:{'android:name':'android.intent.action.VIEW'}}],data:[{$:{'android:scheme':'studyarc'}}]}];
  const m={modResults:{manifest:{'uses-permission':[{$:{'android:name':'android.permission.RECORD_AUDIO','tools:node':'remove'}}],application:[{activity:[{$:{'android:name':'.MainActivity'},'intent-filter':links}]}]}}};
  hooks.manifest(m);hooks.manifest(m);
  const activities=m.modResults.manifest.application[0].activity;
  assert.equal(activities.length,2);assert.equal(activities[1]['intent-filter'],links);
  const config=JSON.parse(fs.readFileSync('app.json','utf8')).expo;
  assert.notEqual(config.plugins.find(p=>p[0]==='expo-image-picker')[1].microphonePermission,false);
  assert.equal(config.plugins.find(p=>p[0]==='expo-audio')[1].recordAudioAndroid,true);
  const a={modResults:{contents:'super.onCreate()\nloadReactNative(this)'}};hooks.application(a);hooks.application(a);
  assert.equal(a.modResults.contents.match(/StudyArcStartupGuard.install/g).length,1);
  assert.ok(a.modResults.contents.indexOf('StudyArcStartupGuard.install')<a.modResults.contents.indexOf('loadReactNative'));
});

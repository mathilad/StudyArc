const fs=require('node:fs');
const assert=require('node:assert/strict');
const {AndroidConfig}=require('@expo/config-plugins');
(async()=>{
 const doc=await AndroidConfig.Manifest.readAndroidManifestAsync('android/app/src/main/AndroidManifest.xml');
 const m=doc.manifest;
 const audio=m['uses-permission'].filter(p=>p.$['android:name']==='android.permission.RECORD_AUDIO');
 assert.ok(audio.length>0,'Audio Recall microphone permission is missing');
 assert.ok(audio.every(p=>p.$['tools:node']!=='remove'),'Audio Recall microphone permission is blocked');
 const acts=m.application[0].activity;
 const gateway=acts.find(a=>a.$['android:name']==='.StudyArcStartupActivity');
 assert.ok(gateway?.['intent-filter']?.some(f=>f.action?.some(a=>a.$['android:name']==='android.intent.action.MAIN')));
 assert.ok(gateway['intent-filter'].some(f=>f.data?.some(a=>a.$['android:scheme']==='studyarc')));
 const app=fs.readFileSync('android/app/src/main/java/com/studyarc/app/MainApplication.kt','utf8');
 assert.ok(app.indexOf('StudyArcStartupGuard.install(this)')<app.indexOf('loadReactNative(this)'));
 assert.ok(app.includes('StudyArcStartupGuard.install(this)'));
 console.log('PASS: generated Android startup guard, app links and microphone permission');
})().catch(e=>{console.error(e);process.exitCode=1});

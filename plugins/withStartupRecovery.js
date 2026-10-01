const {withAndroidManifest,withMainApplication,withDangerousMod}=require('@expo/config-plugins');
const fs=require('fs'),path=require('path');

module.exports=function withStartupRecovery(config){
  config=withAndroidManifest(config,mod=>{
    const manifest=mod.modResults.manifest,app=manifest.application[0];
    const main=app.activity.find(a=>a.$['android:name']==='.MainActivity');
    if(!main)throw new Error('Startup recovery: MainActivity missing');
    if(!app.activity.some(a=>a.$['android:name']==='.StudyArcStartupActivity')){
      app.activity.push({$:{'android:name':'.StudyArcStartupActivity','android:exported':'true','android:launchMode':'singleTop','android:theme':'@android:style/Theme.Material.NoActionBar'},'intent-filter':main['intent-filter']||[]});
      delete main['intent-filter'];
      main.$['android:exported']='false';
    }
    return mod;
  });
  config=withMainApplication(config,mod=>{
    const marker='super.onCreate()';
    if(!mod.modResults.contents.includes('StudyArcStartupGuard.install(this)')){
      if(!mod.modResults.contents.includes(marker))throw new Error('Startup recovery: onCreate marker missing');
      mod.modResults.contents=mod.modResults.contents.replace(marker,marker+'\n    if (StudyArcStartupGuard.install(this)) return');
    }
    const change='super.onConfigurationChanged(newConfig)';
    if(mod.modResults.contents.includes(change)&&!mod.modResults.contents.includes('if (StudyArcStartupGuard.blocked) return')){
      mod.modResults.contents=mod.modResults.contents.replace(change,change+'\n    if (StudyArcStartupGuard.blocked) return');
    }
    return mod;
  });
  return withDangerousMod(config,['android',async mod=>{
    const target=path.join(mod.modRequest.platformProjectRoot,'app/src/main/java/com/studyarc/app');
    fs.mkdirSync(target,{recursive:true});
    for(const name of ['StudyArcStartupGuard.java','StudyArcStartupActivity.java','StudyArcTombstone.java']){
      fs.copyFileSync(path.join(__dirname,'../native/startup',name),path.join(target,name));
    }
    return mod;
  }]);
};

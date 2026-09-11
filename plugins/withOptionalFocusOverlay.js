const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs=require("fs"),path=require("path");
const PACKAGE_PATH=path.join("com","studyarc","app");
module.exports=function withOptionalFocusOverlay(config){
 config=withAndroidManifest(config,mod=>{const m=mod.modResults.manifest;m["uses-permission"]=m["uses-permission"]||[];const name="android.permission.SYSTEM_ALERT_WINDOW";if(!m["uses-permission"].some(x=>x.$?.["android:name"]===name))m["uses-permission"].push({$:{"android:name":name}});return mod});
 config=withMainApplication(config,mod=>{const marker="PackageList(this).packages.apply {";if(!mod.modResults.contents.includes("FocusOverlayPackage()")){if(!mod.modResults.contents.includes(marker))throw new Error("FocusOverlay: package registration marker not found.");mod.modResults.contents=mod.modResults.contents.replace(marker,`${marker}\n          add(FocusOverlayPackage())`)}return mod});
 config=withDangerousMod(config,["android",async mod=>{const dir=path.join(mod.modRequest.platformProjectRoot,"app","src","main","java",PACKAGE_PATH);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"FocusOverlayModule.java"),MODULE);fs.writeFileSync(path.join(dir,"FocusOverlayPackage.java"),PKG);return mod}]);return config;
};
const MODULE=String.raw`package com.studyarc.app;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
public class FocusOverlayModule extends ReactContextBaseJavaModule {
 private final ReactApplicationContext context; private WindowManager manager; private View overlay;
 FocusOverlayModule(ReactApplicationContext c){super(c);context=c;}
 @Override public String getName(){return "FocusOverlay";}
 @ReactMethod public void hasPermission(Promise p){p.resolve(Build.VERSION.SDK_INT<23||Settings.canDrawOverlays(context));}
 @ReactMethod public void requestPermission(Promise p){try{if(Build.VERSION.SDK_INT<23||Settings.canDrawOverlays(context)){p.resolve(true);return;}Intent i=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:"+context.getPackageName()));i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);context.startActivity(i);p.resolve(false);}catch(Exception e){p.reject("overlay_permission",e);}}
 @ReactMethod public void show(String label,Promise p){try{if(Build.VERSION.SDK_INT>=23&&!Settings.canDrawOverlays(context)){p.reject("overlay_permission","Display over other apps is not enabled.");return;}hideInternal();manager=(WindowManager)context.getSystemService(ReactApplicationContext.WINDOW_SERVICE);LinearLayout box=new LinearLayout(context);box.setOrientation(LinearLayout.HORIZONTAL);box.setGravity(Gravity.CENTER_VERTICAL);box.setPadding(28,18,28,18);box.setBackgroundColor(Color.argb(238,18,13,27));TextView text=new TextView(context);text.setText(label==null||label.length()==0?"Study Arc Focus · Return to your session":label);text.setTextColor(Color.WHITE);text.setTextSize(14);text.setTypeface(null,1);box.addView(text);box.setOnClickListener(v->{Intent launch=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());if(launch!=null){launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);context.startActivity(launch);}});int type=Build.VERSION.SDK_INT>=26?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_PHONE;WindowManager.LayoutParams params=new WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.WRAP_CONTENT,type,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);params.gravity=Gravity.TOP|Gravity.CENTER_HORIZONTAL;params.y=70;manager.addView(box,params);overlay=box;p.resolve(true);}catch(Exception e){p.reject("overlay_show",e);}}
 @ReactMethod public void hide(Promise p){try{hideInternal();p.resolve(true);}catch(Exception e){p.reject("overlay_hide",e);}}
 private void hideInternal(){if(manager!=null&&overlay!=null){try{manager.removeView(overlay);}catch(Exception ignored){}}overlay=null;manager=null;}
}`;
const PKG=String.raw`package com.studyarc.app;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;import java.util.Collections;import java.util.List;
public class FocusOverlayPackage implements ReactPackage { public List<NativeModule> createNativeModules(ReactApplicationContext c){List<NativeModule> m=new ArrayList<>();m.add(new FocusOverlayModule(c));return m;} public List<ViewManager> createViewManagers(ReactApplicationContext c){return Collections.emptyList();} }
`;

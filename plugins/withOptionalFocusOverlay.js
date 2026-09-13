const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs=require("fs"),path=require("path");
const PACKAGE_PATH=path.join("com","studyarc","app");

const ensurePermission=(manifest,name)=>{
 manifest["uses-permission"]=manifest["uses-permission"]||[];
 if(!manifest["uses-permission"].some(x=>x.$?.["android:name"]===name))manifest["uses-permission"].push({$:{"android:name":name}});
};

module.exports=function withOptionalFocusOverlay(config){
 config=withAndroidManifest(config,mod=>{
  const manifest=mod.modResults.manifest;
  ensurePermission(manifest,"android.permission.SYSTEM_ALERT_WINDOW");
  ensurePermission(manifest,"android.permission.PACKAGE_USAGE_STATS");
  ensurePermission(manifest,"android.permission.FOREGROUND_SERVICE");
  const application=manifest.application?.[0];
  if(application){
   application.service=application.service||[];
   if(!application.service.some(item=>item.$?.["android:name"]===".FocusBlockerService")){
    application.service.push({$:{"android:name":".FocusBlockerService","android:exported":"false","android:stopWithTask":"false"}});
   }
  }
  manifest.queries=manifest.queries||[{}];
  if(!manifest.queries.length)manifest.queries.push({});
  const query=manifest.queries[0];
  query.intent=query.intent||[];
  const hasLauncherQuery=query.intent.some(item=>item.action?.some(action=>action.$?.["android:name"]==="android.intent.action.MAIN")&&item.category?.some(category=>category.$?.["android:name"]==="android.intent.category.LAUNCHER"));
  if(!hasLauncherQuery)query.intent.push({action:[{$:{"android:name":"android.intent.action.MAIN"}}],category:[{$:{"android:name":"android.intent.category.LAUNCHER"}}]});
  return mod;
 });
 config=withMainApplication(config,mod=>{
  const marker="PackageList(this).packages.apply {";
  if(!mod.modResults.contents.includes("FocusOverlayPackage()")){
   if(!mod.modResults.contents.includes(marker))throw new Error("FocusOverlay: package registration marker not found.");
   mod.modResults.contents=mod.modResults.contents.replace(marker,`${marker}\n          add(FocusOverlayPackage())`);
  }
  return mod;
 });
 config=withDangerousMod(config,["android",async mod=>{
  const dir=path.join(mod.modRequest.platformProjectRoot,"app","src","main","java",PACKAGE_PATH);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"FocusOverlayModule.java"),MODULE);
  fs.writeFileSync(path.join(dir,"FocusOverlayPackage.java"),PKG);
  fs.writeFileSync(path.join(dir,"FocusBlockerService.java"),SERVICE);
  return mod;
 }]);
 return config;
};

const MODULE=String.raw`package com.studyarc.app;
import android.app.Activity;
import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class FocusOverlayModule extends ReactContextBaseJavaModule {
 private final ReactApplicationContext context;
 FocusOverlayModule(ReactApplicationContext c){super(c);context=c;}
 @Override public String getName(){return "FocusOverlay";}
 @ReactMethod public void hasPermission(Promise p){p.resolve(Build.VERSION.SDK_INT<23||Settings.canDrawOverlays(context));}
 @ReactMethod public void requestPermission(Promise p){try{if(Build.VERSION.SDK_INT<23||Settings.canDrawOverlays(context)){p.resolve(true);return;}Intent i=new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:"+context.getPackageName()));i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);context.startActivity(i);p.resolve(false);}catch(Exception e){p.reject("overlay_permission",e);}}
 @ReactMethod public void hasUsageAccess(Promise p){p.resolve(hasUsageAccessInternal());}
 @ReactMethod public void requestUsageAccess(Promise p){try{Intent i=new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);context.startActivity(i);p.resolve(false);}catch(Exception e){p.reject("usage_access",e);}}
 @ReactMethod public void listLaunchableApps(Promise p){try{PackageManager pm=context.getPackageManager();Intent intent=new Intent(Intent.ACTION_MAIN,null);intent.addCategory(Intent.CATEGORY_LAUNCHER);List<ResolveInfo> infos=pm.queryIntentActivities(intent,0);Set<String> seen=new HashSet<>();List<ResolveInfo> unique=new ArrayList<>();for(ResolveInfo info:infos){String pkg=info.activityInfo.packageName;if(pkg.equals(context.getPackageName())||seen.contains(pkg))continue;seen.add(pkg);unique.add(info);}Collections.sort(unique,new Comparator<ResolveInfo>(){public int compare(ResolveInfo a,ResolveInfo b){return String.valueOf(a.loadLabel(pm)).compareToIgnoreCase(String.valueOf(b.loadLabel(pm)));}});WritableArray out=Arguments.createArray();for(ResolveInfo info:unique){WritableMap item=Arguments.createMap();item.putString("label",String.valueOf(info.loadLabel(pm)));item.putString("packageName",info.activityInfo.packageName);out.pushMap(item);}p.resolve(out);}catch(Exception e){p.reject("app_list",e);}}
 @ReactMethod public void startBlocker(ReadableArray allowedPackages,Promise p){try{if(!hasUsageAccessInternal()){p.reject("usage_access","Usage access is required for app blocking.");return;}if(Build.VERSION.SDK_INT>=23&&!Settings.canDrawOverlays(context)){p.reject("overlay_permission","Display over other apps is required only while app blocking is enabled.");return;}ArrayList<String> allowed=new ArrayList<>();for(int i=0;i<allowedPackages.size();i++){String value=allowedPackages.getString(i);if(value!=null&&!value.isEmpty())allowed.add(value);}Intent service=new Intent(context,FocusBlockerService.class);service.putStringArrayListExtra("allowedPackages",allowed);if(Build.VERSION.SDK_INT>=26)context.startForegroundService(service);else context.startService(service);p.resolve(true);}catch(Exception e){p.reject("focus_blocker_start",e);}}
 @ReactMethod public void stopBlocker(Promise p){try{context.stopService(new Intent(context,FocusBlockerService.class));p.resolve(true);}catch(Exception e){p.reject("focus_blocker_stop",e);}}
 @ReactMethod public void isBlocking(Promise p){p.resolve(FocusBlockerService.isActive());}
 @ReactMethod public void show(String label,Promise p){try{if(Build.VERSION.SDK_INT>=23&&!Settings.canDrawOverlays(context)){p.reject("overlay_permission","Display over other apps is not enabled.");return;}Intent service=new Intent(context,FocusBlockerService.class);service.setAction(FocusBlockerService.ACTION_REMINDER);service.putExtra("label",label);if(Build.VERSION.SDK_INT>=26)context.startForegroundService(service);else context.startService(service);p.resolve(true);}catch(Exception e){p.reject("overlay_show",e);}}
 @ReactMethod public void hide(Promise p){try{Intent i=new Intent(context,FocusBlockerService.class);i.setAction(FocusBlockerService.ACTION_HIDE_REMINDER);if(Build.VERSION.SDK_INT>=26)context.startForegroundService(i);else context.startService(i);p.resolve(true);}catch(Exception e){p.reject("overlay_hide",e);}}
 @ReactMethod public void setImmersiveMode(boolean enabled,Promise p){Activity activity=getCurrentActivity();if(activity==null){p.resolve(false);return;}activity.runOnUiThread(()->{try{if(Build.VERSION.SDK_INT>=30){WindowInsetsController controller=activity.getWindow().getInsetsController();if(controller!=null){int bars=WindowInsets.Type.statusBars()|WindowInsets.Type.navigationBars();if(enabled){controller.hide(bars);controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}else controller.show(bars);}}else{View decor=activity.getWindow().getDecorView();if(enabled)decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);else decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);}p.resolve(true);}catch(Exception e){p.reject("immersive_mode",e);}});}
 private boolean hasUsageAccessInternal(){AppOpsManager appOps=(AppOpsManager)context.getSystemService(Context.APP_OPS_SERVICE);int mode=appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,Process.myUid(),context.getPackageName());return mode==AppOpsManager.MODE_ALLOWED;}
}`;

const SERVICE=String.raw`package com.studyarc.app;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

public class FocusBlockerService extends Service {
 public static final String ACTION_REMINDER="com.studyarc.app.SHOW_FOCUS_REMINDER";
 public static final String ACTION_HIDE_REMINDER="com.studyarc.app.HIDE_FOCUS_REMINDER";
 private static final String CHANNEL="studyarc_focus_blocker";
 private static volatile boolean active=false;
 private final Set<String> allowedPackages=new HashSet<>();
 private Handler handler;
 private WindowManager windowManager;
 private View overlay;
 private boolean blockingMode=false;
 private String reminderLabel="StudyArc Focus · Tap to return to your study session";
 public static boolean isActive(){return active;}
 @Override public void onCreate(){super.onCreate();handler=new Handler(Looper.getMainLooper());windowManager=(WindowManager)getSystemService(WINDOW_SERVICE);createChannel();}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  startForeground(4207,buildNotification());
  if(intent!=null&&ACTION_REMINDER.equals(intent.getAction())){blockingMode=false;reminderLabel=intent.getStringExtra("label");if(reminderLabel==null||reminderLabel.isEmpty())reminderLabel="StudyArc Focus · Tap to return to your study session";showReminder();return START_NOT_STICKY;}
  if(intent!=null&&ACTION_HIDE_REMINDER.equals(intent.getAction())){hideOverlay();if(!blockingMode)stopSelf();return START_NOT_STICKY;}
  ArrayList<String> allowed=intent==null?null:intent.getStringArrayListExtra("allowedPackages");allowedPackages.clear();if(allowed!=null)allowedPackages.addAll(allowed);blockingMode=true;active=true;handler.removeCallbacks(checkRunnable);handler.post(checkRunnable);return START_STICKY;
 }
 private final Runnable checkRunnable=new Runnable(){@Override public void run(){if(!blockingMode)return;try{String pkg=foregroundPackage();if(pkg==null||pkg.equals(getPackageName())||pkg.equals("com.android.systemui")||pkg.equals("com.google.android.permissioncontroller")||allowedPackages.contains(pkg)){hideOverlay();}else showBlocked(pkg);}catch(Exception ignored){}handler.postDelayed(this,650);}};
 private String foregroundPackage(){UsageStatsManager manager=(UsageStatsManager)getSystemService(Context.USAGE_STATS_SERVICE);if(manager==null)return null;long end=System.currentTimeMillis();UsageEvents events=manager.queryEvents(end-3500,end);UsageEvents.Event event=new UsageEvents.Event();String latest=null;long latestTime=0;while(events.hasNextEvent()){events.getNextEvent(event);int type=event.getEventType();if((type==UsageEvents.Event.MOVE_TO_FOREGROUND||(Build.VERSION.SDK_INT>=29&&type==UsageEvents.Event.ACTIVITY_RESUMED))&&event.getTimeStamp()>=latestTime){latest=event.getPackageName();latestTime=event.getTimeStamp();}}return latest;}
 private void showBlocked(String packageName){if(Build.VERSION.SDK_INT>=23&&!Settings.canDrawOverlays(this)){stopSelf();return;}if(overlay!=null&&packageName.equals(String.valueOf(overlay.getTag())))return;hideOverlay();LinearLayout root=new LinearLayout(this);root.setTag(packageName);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER);root.setPadding(56,56,56,56);root.setBackgroundColor(Color.rgb(8,13,20));TextView shield=new TextView(this);shield.setText("STUDYARC  •  FOCUS SHIELD");shield.setTextColor(Color.rgb(190,154,247));shield.setTextSize(15);shield.setGravity(Gravity.CENTER);root.addView(shield);TextView title=new TextView(this);title.setText("Stay with your study session");title.setTextColor(Color.WHITE);title.setTextSize(25);title.setGravity(Gravity.CENTER);title.setPadding(0,28,0,10);title.setTypeface(null,1);root.addView(title);TextView body=new TextView(this);body.setText("This app is blocked while Focus Shield is active. You can allow it from StudyArc's Focus Shield settings.");body.setTextColor(Color.rgb(160,174,190));body.setTextSize(15);body.setGravity(Gravity.CENTER);body.setPadding(12,0,12,28);root.addView(body);TextView button=new TextView(this);button.setText("Return to StudyArc");button.setTextColor(Color.rgb(22,11,32));button.setTextSize(16);button.setTypeface(null,1);button.setGravity(Gravity.CENTER);button.setPadding(40,26,40,26);button.setBackgroundColor(Color.rgb(183,132,255));button.setOnClickListener(v->openStudyArc());root.addView(button);addOverlay(root,WindowManager.LayoutParams.MATCH_PARENT,WindowManager.LayoutParams.MATCH_PARENT,0);}
 private void showReminder(){if(Build.VERSION.SDK_INT>=23&&!Settings.canDrawOverlays(this)){stopSelf();return;}hideOverlay();LinearLayout box=new LinearLayout(this);box.setGravity(Gravity.CENTER_VERTICAL);box.setPadding(28,18,28,18);box.setBackgroundColor(Color.argb(238,18,13,27));TextView text=new TextView(this);text.setText(reminderLabel);text.setTextColor(Color.WHITE);text.setTextSize(14);text.setTypeface(null,1);box.addView(text);box.setOnClickListener(v->openStudyArc());addOverlay(box,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.WRAP_CONTENT,70);}
 private void addOverlay(View view,int width,int height,int y){int type=Build.VERSION.SDK_INT>=26?WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY:WindowManager.LayoutParams.TYPE_PHONE;WindowManager.LayoutParams params=new WindowManager.LayoutParams(width,height,type,WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE|WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT);params.gravity=y==0?Gravity.TOP|Gravity.START:Gravity.TOP|Gravity.CENTER_HORIZONTAL;params.y=y;windowManager.addView(view,params);overlay=view;}
 private void openStudyArc(){Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());if(launch!=null){launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);startActivity(launch);}}
 private void hideOverlay(){if(windowManager!=null&&overlay!=null){try{windowManager.removeView(overlay);}catch(Exception ignored){}}overlay=null;}
 private void createChannel(){if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel(CHANNEL,"StudyArc Focus Shield",NotificationManager.IMPORTANCE_LOW);channel.setDescription("Shown only while optional Focus Shield app blocking is active.");NotificationManager nm=getSystemService(NotificationManager.class);if(nm!=null)nm.createNotificationChannel(channel);}}
 private Notification buildNotification(){Intent launch=getPackageManager().getLaunchIntentForPackage(getPackageName());PendingIntent pending=null;if(launch!=null){launch.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);int flags=PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=23?PendingIntent.FLAG_IMMUTABLE:0);pending=PendingIntent.getActivity(this,4207,launch,flags);}Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,CHANNEL):new Notification.Builder(this);builder.setContentTitle("StudyArc Focus Shield").setContentText(blockingMode?"Distracting apps are blocked during this study session.":"Focus reminder is active.").setSmallIcon(getApplicationInfo().icon).setOngoing(true);if(pending!=null)builder.setContentIntent(pending);return builder.build();}
 @Override public void onDestroy(){active=false;blockingMode=false;if(handler!=null)handler.removeCallbacks(checkRunnable);hideOverlay();super.onDestroy();}
 @Override public IBinder onBind(Intent intent){return null;}
}`;

const PKG=String.raw`package com.studyarc.app;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;import java.util.Collections;import java.util.List;
public class FocusOverlayPackage implements ReactPackage { public List<NativeModule> createNativeModules(ReactApplicationContext c){List<NativeModule> m=new ArrayList<>();m.add(new FocusOverlayModule(c));return m;} public List<ViewManager> createViewManagers(ReactApplicationContext c){return Collections.emptyList();} }
`;

/* ============================================================
   E1FITNESS — native shell glue (Capacitor)
   ------------------------------------------------------------
   This file is intentionally separate from app.js and touches
   NOTHING in the core application — no DB, no renderers, no rest
   timer, no navigation. It only configures native chrome (status
   bar, splash screen) when running inside the Capacitor iOS/Android
   shell, and is a complete no-op when the app is opened as a plain
   web page (window.Capacitor is undefined there), so the desktop/
   browser version is unaffected.
   ============================================================ */
(function(){
  var Capacitor = window.Capacitor;
  var isNative = !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  // app.js checks this (see the #exportData handler) to decide whether a
  // backup export needs the native Share Sheet instead of an <a download>
  // click — a bare WebView has no browser download manager to catch that,
  // so on native it silently does nothing. window.e1Native always exists
  // (even on plain web, where isNative is false) so app.js never needs an
  // existence check, only an isNative check.
  window.e1Native = { isNative: isNative };
  if(!isNative) return;

  var Plugins = Capacitor.Plugins || {};

  // Writes the backup JSON into the app's cache directory, then opens the
  // native Share Sheet (iOS) / share intent (Android) so the user can save
  // it to Files/Drive/email/etc. Requires no permissions beyond what
  // @capacitor/filesystem and @capacitor/share already declare.
  window.e1Native.exportBackup = function(filename, jsonString){
    var Filesystem = Plugins.Filesystem, Share = Plugins.Share;
    if(!Filesystem || !Share) return Promise.reject(new Error('Filesystem/Share plugin unavailable'));
    return Filesystem.writeFile({ path: filename, data: jsonString, directory: 'CACHE', encoding: 'utf8' })
      .then(function(res){
        return Filesystem.getUri({ path: filename, directory: 'CACHE' });
      })
      .then(function(res){
        return Share.share({ title: 'E1FITNESS Backup', url: res.uri, dialogTitle: 'Save E1FITNESS backup' });
      });
  };

  // Dark status bar (light icons) matching the app's dark theme, and an
  // explicit background color so there's no light flash behind the icons
  // before the WebView finishes its first paint.
  if(Plugins.StatusBar){
    try{
      Plugins.StatusBar.setStyle({ style: 'DARK' }); // dark background -> light (white) status bar icons
      if(Plugins.StatusBar.setBackgroundColor){
        Plugins.StatusBar.setBackgroundColor({ color: '#0E1116' });
      }
      if(Plugins.StatusBar.setOverlaysWebView){
        Plugins.StatusBar.setOverlaysWebView({ overlay: true }); // content draws under it; app.css safe-area padding handles the rest
      }
    }catch(e){ /* plugin unavailable on this platform build — status bar keeps its native default */ }
  }

  // Hide the native splash screen once the app has actually rendered its
  // first real screen (Dashboard or onboarding), not just once index.html
  // has loaded, so there's no gap where a blank dark screen is visible.
  function hideSplash(){
    if(Plugins.SplashScreen){
      try{ Plugins.SplashScreen.hide(); }catch(e){ /* no-op if unavailable */ }
    }
  }
  if(document.readyState==='complete'){
    setTimeout(hideSplash, 60);
  } else {
    window.addEventListener('load', function(){ setTimeout(hideSplash, 60); });
  }
})();

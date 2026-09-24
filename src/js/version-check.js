/* ============================================================
   E1FITNESS — deployed-version check
   ------------------------------------------------------------
   Entirely separate from app.js and native-bridge.js, and a complete
   no-op unless window.E1_BUILD_VERSION has been set — which only
   happens on the GitHub Pages build (stamped in by the deploy
   workflow). Local/file:// testing and the Capacitor native build
   never define it, so this file does nothing there.

   What it does on the deployed site: periodically fetches version.json
   (also stamped by the same workflow) and compares its version to the
   one baked into the page the phone already loaded. If they differ,
   it shows the existing toast()'s action-button (same mechanism as
   the set-delete Undo) with a "Refresh" button that reloads the page.

   This never touches localStorage/DB in any way — it only ever calls
   location.reload(), a normal navigation that leaves stored data
   untouched, exactly like the user manually pulling to refresh.
   ============================================================ */
(function(){
  if(!window.E1_BUILD_VERSION) return;

  let lastCheck = 0;
  let notified = false;

  function checkForUpdate(){
    const now = Date.now();
    if(now - lastCheck < 60000) return; // never more than once a minute
    lastCheck = now;
    fetch('version.json?_=' + now, {cache:'no-store'})
      .then(r=> r.ok ? r.json() : null)
      .then(data=>{
        if(!data || !data.version || notified) return;
        if(data.version !== window.E1_BUILD_VERSION){
          notified = true;
          if(typeof toast==='function'){
            toast('A new version of E1FITNESS is available', {action:{label:'Refresh', onClick: ()=> location.reload()}});
          }
        }
      })
      .catch(()=>{}); // offline, blocked, or mid-deploy 404 — never breaks the app, just skip silently
  }

  window.addEventListener('load', ()=> setTimeout(checkForUpdate, 2000));
  // Covers the common case of leaving the tab/app open and coming back to
  // it later, which is the scenario most likely to be running stale code.
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') checkForUpdate(); });
})();

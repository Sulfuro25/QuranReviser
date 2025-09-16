// profile-ui.js — header profile selector and streak badge
window.QR = window.QR || {};

(function(){
  function renderHeaderUI(){
    try {
      const host = document.querySelector('.header-actions') || document.querySelector('.app-header .header-actions');
      if (!host) return;

      // container
      let wrap = document.getElementById('qr-profile-wrap');
      if (!wrap){ wrap = document.createElement('div'); wrap.id = 'qr-profile-wrap'; wrap.style.display='inline-flex'; wrap.style.alignItems='center'; wrap.style.gap='8px'; host.prepend(wrap); }

      // streak badge
      let badge = document.getElementById('qr-streak');
      if (!badge){ badge = document.createElement('span'); badge.id = 'qr-streak'; badge.className = 'muted'; wrap.appendChild(badge); }

      // selector
      let sel = document.getElementById('qr-profile-select');
      if (!sel){ sel = document.createElement('select'); sel.id = 'qr-profile-select'; sel.className = 'btn'; sel.style.padding='6px 10px'; sel.style.height='36px'; wrap.appendChild(sel); }

      const pros = (QR.profiles && QR.profiles.list()) || [];
      sel.replaceChildren(...pros.map(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = `Profile: ${p.name}`; return o; }));
      try { sel.value = QR.profiles.currentId(); } catch {}

      sel.onchange = () => { QR.profiles.setCurrent(sel.value); refreshBadge(); };

      // context menu for manage
      sel.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        const action = prompt('Type: new, rename, delete');
        if (!action) return;
        if (/^new/i.test(action)){
          const name = prompt('New profile name', 'User'); if (name) QR.profiles.add(name);
        } else if (/^rename/i.test(action)){
          const cur = sel.value; const name = prompt('Rename to', pros.find(p=>p.id===cur)?.name || ''); if (name) QR.profiles.rename(cur, name);
        } else if (/^del|^rem/i.test(action)){
          const cur = sel.value; if (confirm('Delete this profile?')) QR.profiles.remove(cur);
        }
        renderHeaderUI(); refreshBadge();
      });

      refreshBadge();
    } catch {}
  }

  function refreshBadge(){
    try {
      const badge = document.getElementById('qr-streak'); if (!badge) return;
      const data = JSON.parse(QR.profiles.getItem('qr_streak')||'null') || { current:0 };
      const cur = Number(data.current)||0;
      badge.textContent = cur>0 ? `🔥 ${cur}` : '';
    } catch {}
  }

  window.addEventListener('qr:profile-changed', ()=>{ renderHeaderUI(); });
  document.addEventListener('DOMContentLoaded', ()=>{ try { QR.profiles.list(); } catch {}; renderHeaderUI(); });
  window.QR = window.QR || {}; window.QR.profileUI = { renderHeaderUI };
})();


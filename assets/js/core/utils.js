// utils.js — shared helpers
window.QR = window.QR || {};

QR.utils = (function(){
  function clamp(n,min,max){
    n = Number(n)||0;
    if(n<min) return min;
    if(n>max) return max;
    return n;
  }

  function parseRangeList(input, max){
    if (!input || typeof input !== 'string') return [];
    const out = new Set();
    input.split(',').map(s => s.trim()).filter(Boolean).forEach(chunk => {
      const m = chunk.match(/^([0-9]{1,3})(?:\s*-\s*([0-9]{1,3}))?$/);
      if (!m) return;
      const a = Math.max(1, Math.min(max, parseInt(m[1],10)||0));
      const b = m[2] ? Math.max(1, Math.min(max, parseInt(m[2],10)||0)) : a;
      const start = Math.min(a,b), end = Math.max(a,b);
      for(let i=start;i<=end;i++) out.add(i);
    });
    return Array.from(out.values()).sort((x,y)=>x-y);
  }

  function seededRng(seed){
    if (!seed) return Math.random;
    let s = 0; const str = String(seed);
    for (let i=0;i<str.length;i++){ s = (s*31 + str.charCodeAt(i)) >>> 0; }
    return function(){
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s>>>0) % 1_000_000) / 1_000_000;
    };
  }

  // HTML Sanitization for XSS Prevention
  function sanitizeHTML(dirty){
    if (!dirty || typeof dirty !== 'string') return '';
    
    // Create a temporary div for parsing
    const temp = document.createElement('div');
    temp.textContent = dirty; // This escapes all HTML
    
    return temp.innerHTML;
  }

  function sanitizeTajweedHTML(dirty){
    if (!dirty || typeof dirty !== 'string') return '';
    
    // Whitelist for Tajweed spans only
    const ALLOWED_TAGS = ['span', 'br'];
    const ALLOWED_CLASSES = ['ham_wasl', 'slnt', 'madda_normal', 'madda_permissible', 'madda_necessary', 
                            'qlq', 'laam_shamsiyah', 'ikhf_shfw', 'ikhf', 'idghm_shfw', 'idghm_wo_ghunnah',
                            'idghm_w_ghunnah', 'iqlab', 'ikhf_mim', 'qalqalah', 'madda_246', 'madda_6', 
                            'madda_muttasil', 'madda_munfasil', 'ghunnah'];
    
    const temp = document.createElement('div');
    temp.innerHTML = dirty;
    
    // Recursively clean the tree
    function cleanNode(node){
      if (node.nodeType === 3) return; // Text nodes are safe
      
      if (node.nodeType === 1){ // Element node
        const tagName = node.tagName.toLowerCase();
        
        // Remove disallowed tags
        if (!ALLOWED_TAGS.includes(tagName)){
          node.parentNode.replaceChild(document.createTextNode(node.textContent), node);
          return;
        }
        
        // Clean attributes - only allow class attribute with whitelisted values
        if (tagName === 'span'){
          const className = node.getAttribute('class') || '';
          const cleanClasses = className.split(' ').filter(c => ALLOWED_CLASSES.includes(c));
          
          // Remove all attributes
          while (node.attributes.length > 0) {
            node.removeAttribute(node.attributes[0].name);
          }
          
          // Add back clean classes
          if (cleanClasses.length > 0) {
            node.setAttribute('class', cleanClasses.join(' '));
          }
        } else {
          // BR tags shouldn't have any attributes
          while (node.attributes.length > 0) {
            node.removeAttribute(node.attributes[0].name);
          }
        }
        
        // Recursively clean children
        const children = Array.from(node.childNodes);
        children.forEach(child => cleanNode(child));
      }
    }
    
    cleanNode(temp);
    return temp.innerHTML;
  }

  function escapeHTML(str){
    if (!str || typeof str !== 'string') return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, m => map[m]);
  }

  function validateVerseKey(key){
    if (!key || typeof key !== 'string') return false;
    const match = key.match(/^(\d{1,3}):(\d{1,3})$/);
    if (!match) return false;
    const surah = parseInt(match[1], 10);
    const verse = parseInt(match[2], 10);
    return surah >= 1 && surah <= 114 && verse >= 1 && verse <= 286;
  }

  function validatePageNumber(page){
    const p = parseInt(page, 10);
    return !isNaN(p) && p >= 1 && p <= 604;
  }

  function validateConfidenceLevel(level){
    return ['weak', 'ok', 'strong'].includes(level);
  }

  return { clamp, parseRangeList, seededRng, sanitizeHTML, sanitizeTajweedHTML, escapeHTML, 
           validateVerseKey, validatePageNumber, validateConfidenceLevel };
})();

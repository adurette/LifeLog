// Run before the page paints; only known theme names can reach the DOM.
export const appearanceScript = `(function(){try{var t=localStorage.getItem('lifelog-theme');var c={paper:'#f5f2ea',ocean:'#edf4f8',night:'#17211e'};if(c[t]){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=c[t];}}catch(e){}})();`;

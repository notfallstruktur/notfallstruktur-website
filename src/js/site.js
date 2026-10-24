(function(){
  var btn=document.getElementById('menuBtn'), nav=document.getElementById('mainNav');
  var ds=[].slice.call(document.querySelectorAll('nav.main details'));

  /* Startfoto beim Scrollen abdunkeln */
  (function(){
    var h=document.querySelector('.hero'); if(!h) return;
    var t=false;
    function upd(){ var r=h.getBoundingClientRect(); var p=Math.min(1,Math.max(0,-r.top/(r.height||1))); h.style.setProperty('--dim',(p*0.6).toFixed(3)); t=false; }
    window.addEventListener('scroll',function(){ if(!t){t=true; requestAnimationFrame(upd);} },{passive:true}); upd();
  })();

  /* Teilen (Handy: Teilen-Menü, sonst Link kopieren) */
  document.querySelectorAll('.sharebtn').forEach(function(b){
    b.addEventListener('click',function(){
      var u=b.getAttribute('data-url'), l=b.querySelector('span'), alt=l.textContent;
      function ok(){ l.textContent='Link kopiert!'; setTimeout(function(){l.textContent=alt;},2000); }
      if(navigator.share){ navigator.share({title:b.getAttribute('data-title'),text:b.getAttribute('data-text'),url:u}).catch(function(){}); return; }
      if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(u).then(ok,function(){}); }
      else { var x=document.createElement('textarea'); x.value=u; document.body.appendChild(x); x.select(); try{document.execCommand('copy'); ok();}catch(e){} x.remove(); }
    });
  });

  /* Externe Links immer in neuem Tab */
  document.querySelectorAll('a[href]').forEach(function(a){
    if(/^https?:/i.test(a.getAttribute('href')) && a.hostname!==location.hostname){ a.target='_blank'; a.rel='noopener noreferrer'; }
  });

  /* Aktiver Menüpunkt */
  var path=location.pathname.replace(/index\.html$/,'');
  document.querySelectorAll('nav.main a').forEach(function(a){
    if(a.getAttribute('href')===path) a.setAttribute('aria-current','page');
  });
  ds.forEach(function(d){d.querySelector('summary').classList.toggle('cur',!!d.querySelector('a[aria-current]'));});

  /* Menü */
  btn.addEventListener('click',function(){
    var open=nav.classList.toggle('open');
    btn.setAttribute('aria-expanded',open?'true':'false');
  });
  ds.forEach(function(d){d.addEventListener('toggle',function(){if(d.open && !mq.matches){ds.forEach(function(o){if(o!==d)o.open=false;});}});});
  var mq=window.matchMedia('(max-width:820px)');
  document.addEventListener('click',function(e){
    if(!mq.matches && !e.target.closest('nav.main details')) ds.forEach(function(d){d.open=false;});
  });

  function formJSON(f){
    var o={};
    new FormData(f).forEach(function(v,k){
      if(k==='cf-turnstile-response') return;
      if(o[k]!==undefined){ if(!Array.isArray(o[k])) o[k]=[o[k]]; o[k].push(v); } else o[k]=v;
    });
    return o;
  }
  function send(url,data){
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r; });
  }
  function fail(f,msg){
    var p=f.querySelector('.form-err');
    if(!p){p=document.createElement('p');p.className='form-err';f.appendChild(p);}
    p.textContent=msg;
  }

  /* Newsletter -> Brevo */
  (function(){
    var f=document.getElementById('nlForm'); if(!f) return;
    var ok=document.getElementById('nlOk'), m=document.getElementById('nlMail');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(!m.checkValidity()){m.reportValidity();return;}
      var fd=new FormData();
      fd.append('EMAIL',m.value); fd.append('email_address_check',''); fd.append('locale','de');
      fetch(window.SITE.brevoUrl,{method:'POST',mode:'no-cors',body:fd})
        .then(function(){ f.hidden=true; ok.hidden=false; ok.textContent='Vielen Dank! Bitte bestätige deine Anmeldung über den Link in der E-Mail, die du gleich erhältst.'; })
        .catch(function(){ fail(f,'Die Anmeldung hat nicht geklappt. Bitte versuche es später noch einmal.'); });
    });
  })();

  /* Kontaktformular */
  (function(){
    var f=document.getElementById('cfForm'); if(!f) return;
    var ok=document.getElementById('cfOk');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var req=['cfMail','cfMsg'];
      for(var i=0;i<req.length;i++){var el=document.getElementById(req[i]); if(!el.checkValidity()){el.reportValidity();return;}}
      var d=formJSON(f);
      var t=f.querySelector('[name="cf-turnstile-response"]'); if(t) d.turnstile=t.value;
      send('/api/kontakt',d).then(function(){f.hidden=true;ok.hidden=false;})
        .catch(function(){fail(f,'Die Nachricht konnte nicht gesendet werden. Bitte schreibe stattdessen an kontakt(at)notfallstruktur.org.');});
    });
  })();

  /* Feedback allgemein */
  (function(){
    var f=document.getElementById('fbForm'); if(!f) return;
    var deat=f.querySelector('.q-deat'), ch=f.querySelector('.q-ch');
    function upd(){
      var v=(f.querySelector('input[name=land]:checked')||{}).value;
      if(ch) ch.hidden=(v!=='Schweiz'); if(deat) deat.hidden=(v==='Schweiz');
    }
    f.addEventListener('change',upd); upd();
    f.addEventListener('submit',function(e){
      e.preventDefault();
      send('/api/feedback',{formular:'allgemein',antworten:formJSON(f)})
        .then(function(){f.hidden=true; document.getElementById('fbThanks').hidden=false; window.scrollTo(0,0);})
        .catch(function(){fail(f,'Das Feedback konnte nicht gesendet werden. Bitte versuche es später noch einmal.');});
    });
  })();

  /* Feedback RSI */
  (function(){
    var f=document.getElementById('rsiForm'); if(!f) return;
    var de=f.querySelector('.rq-deat'), ch=f.querySelector('.rq-ch');
    function upd(){
      var v=(f.querySelector('input[name=rsi_land]:checked')||{}).value;
      ch.hidden=(v!=='Schweiz'); de.hidden=(v==='Schweiz');
    }
    f.addEventListener('change',upd); upd();
    f.addEventListener('submit',function(ev){
      ev.preventDefault();
      send('/api/feedback',{formular:'rsi',antworten:formJSON(f)})
        .then(function(){f.hidden=true; document.getElementById('rsiThanks').hidden=false;})
        .catch(function(){fail(f,'Das Feedback konnte nicht gesendet werden. Bitte versuche es später noch einmal.');});
    });
  })();

  /* Umschalter Schweiz / Deutschland */
  (function(){
    var segs=document.querySelectorAll('.segb');
    segs.forEach(function(b){b.addEventListener('click',function(){
      var v=b.getAttribute('data-v');
      segs.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
      document.querySelectorAll('img.medv').forEach(function(im){im.hidden=im.getAttribute('data-v')!==v;});
    });});
  })();

  /* Schritte auf Höhe der Karte */
  (function(){
    function fit(){
      document.querySelectorAll('ol.steps.at').forEach(function(ol){
        if(window.matchMedia('(max-width:820px)').matches){ol.style.height='';return;}
        var img=ol.parentNode.querySelector('figure img:not([hidden])');
        if(img&&img.offsetHeight) ol.style.height=img.offsetHeight+'px';
      });
    }
    if(window.ResizeObserver){var ro=new ResizeObserver(fit); document.querySelectorAll('.split.nk.al figure img').forEach(function(i){ro.observe(i);});}
    window.addEventListener('resize',fit); window.addEventListener('load',fit); fit();
  })();
})();

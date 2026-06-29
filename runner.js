// CSC1101 Virtual Lab - runs code on a free cloud compiler (Piston)
(function(){
  var PISTON = "https://emkc.org/api/v2/piston";
  var ONLINE_CPP = "https://www.onlinegdb.com/online_c++_compiler";
  var ONLINE_PY  = "https://www.online-python.com/";
  var runtimesPromise = null;

  function getRuntimes(){
    if(!runtimesPromise){
      runtimesPromise = fetch(PISTON+"/runtimes").then(function(r){ return r.json(); });
    }
    return runtimesPromise;
  }
  function pistonLang(lang){ return lang==="python" ? "python" : "c++"; }
  function escapeHtml(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function show(out, html, isErr){
    out.classList.add("show");
    out.innerHTML = (isErr?'<span class="err">':'')+html+(isErr?'</span>':'');
  }
  function fallback(out, lab){
    var expect = lab.getAttribute("data-expect")||"";
    var link = lab.getAttribute("data-lang")==="python"?ONLINE_PY:ONLINE_CPP;
    var html = '<span class="muted">Could not reach the online compiler (check your internet). '+
      'Expected output:</span>\n'+escapeHtml(expect)+
      '\n\n<span class="muted">Or click Copy and run it here:</span>\n'+
      '<a style="color:#9ec7ff" target="_blank" rel="noopener" href="'+link+'">'+link+'</a>';
    show(out, html, false);
  }

  async function runCode(lang, code, out, lab){
    show(out, '<span class="muted">Running your code on the online compiler...</span>', false);
    try{
      var runtimes = await getRuntimes();
      var pl = pistonLang(lang);
      var rt = null;
      for(var i=0;i<runtimes.length;i++){ if(runtimes[i].language===pl){ rt = runtimes[i]; break; } }
      if(!rt){ fallback(out, lab); return; }
      var filename = lang==="python" ? "main.py" : "main.cpp";
      var body = { language: pl, version: rt.version,
        files:[{ name: filename, content: code }],
        stdin: lab.getAttribute("data-stdin")||"" };
      var res = await fetch(PISTON+"/execute", {
        method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      if(!res.ok){ fallback(out, lab); return; }
      var data = await res.json();
      var compileErr = data.compile && data.compile.code && data.compile.stderr ? data.compile.stderr : "";
      var run = data.run || {};
      var text = "";
      if(compileErr) text += compileErr + "\n";
      text += (run.stdout||"");
      if(run.stderr) text += run.stderr;
      var isErr = !!(compileErr || run.stderr);
      show(out, escapeHtml(text.length?text:"(no output)"), isErr);
    }catch(e){
      fallback(out, lab);
    }
  }

  function init(){
    document.querySelectorAll(".lab").forEach(function(lab){
      var lang = lab.getAttribute("data-lang");
      var ta = lab.querySelector("textarea.code");
      if(!ta) return;
      function grow(){ ta.style.height="auto"; ta.style.height=(ta.scrollHeight+4)+"px"; }
      ta.addEventListener("input", grow); setTimeout(grow, 0);
      ta.addEventListener("keydown", function(e){
        if(e.key==="Tab"){ e.preventDefault();
          var st=ta.selectionStart, en=ta.selectionEnd;
          ta.value=ta.value.slice(0,st)+"    "+ta.value.slice(en);
          ta.selectionStart=ta.selectionEnd=st+4; }
      });
      var out = lab.querySelector(".out");
      var runBtn = lab.querySelector(".btn-run");
      if(runBtn) runBtn.addEventListener("click", function(){ runCode(lang, ta.value, out, lab); });
      var copyBtn = lab.querySelector(".btn-copy");
      if(copyBtn) copyBtn.addEventListener("click", function(){
        try{ navigator.clipboard.writeText(ta.value); }catch(e){ ta.select(); document.execCommand("copy"); }
        copyBtn.textContent="Copied!"; setTimeout(function(){copyBtn.textContent="Copy";},1200);
      });
    });
  }
  if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded", init); }
  else { init(); }
})();

// CSC1101 Virtual Lab - in-browser code runner
(function(){
  var editors = [];
  var ONLINE_CPP = "https://www.onlinegdb.com/online_c++_compiler";
  var ONLINE_PY  = "https://www.online-python.com/";

  function el(tag, cls, txt){ var e=document.createElement(tag); if(cls)e.className=cls; if(txt!=null)e.textContent=txt; return e; }

  // Build a lab block from a <div class="lab" data-lang="python|cpp" data-expect="...">
  document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll(".lab").forEach(function(lab){
      var lang = lab.getAttribute("data-lang");
      var ta = lab.querySelector("textarea.code");
      if(!ta) return;
      // auto-grow the textarea to fit its content
      function grow(){ ta.style.height="auto"; ta.style.height=(ta.scrollHeight+4)+"px"; }
      ta.addEventListener("input", grow); setTimeout(grow, 0);
      // allow Tab to insert spaces instead of leaving the box
      ta.addEventListener("keydown", function(e){
        if(e.key==="Tab"){ e.preventDefault();
          var st=ta.selectionStart, en=ta.selectionEnd;
          ta.value=ta.value.slice(0,st)+"    "+ta.value.slice(en);
          ta.selectionStart=ta.selectionEnd=st+4; }
      });
      var out = lab.querySelector(".out");
      var runBtn = lab.querySelector(".btn-run");
      if(runBtn) runBtn.addEventListener("click", function(){
        run(lang, ta.value, out, lab);
      });
      var copyBtn = lab.querySelector(".btn-copy");
      if(copyBtn) copyBtn.addEventListener("click", function(){
        try{ navigator.clipboard.writeText(ta.value); }catch(e){ ta.select(); document.execCommand("copy"); }
        copyBtn.textContent="Copied!"; setTimeout(function(){copyBtn.textContent="Copy";},1200);
      });
    });
  });

  function show(out, html, isErr){
    out.classList.add("show");
    out.innerHTML = (isErr?'<span class="err">':'')+html+(isErr?'</span>':'');
  }
  function fallback(out, lab){
    var expect = lab.getAttribute("data-expect")||"";
    var link = lab.getAttribute("data-lang")==="python"?ONLINE_PY:ONLINE_CPP;
    var html = '<span class="muted">The in-browser runner could not run this one. '+
      'Expected output:</span>\n'+escapeHtml(expect)+
      '\n\n<span class="muted">Tip: click Copy, then run it in g++ / your IDE, or in a free online compiler:</span>\n'+
      '<a style="color:#9ec7ff" target="_blank" href="'+link+'">'+link+'</a>';
    show(out, html, false);
  }
  function escapeHtml(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  // ---------- C++ via JSCPP ----------
  function runCpp(code, out, lab){
    show(out, '<span class="muted">Running C++ ...</span>', false);
    try{
      if(typeof JSCPP === "undefined"){ fallback(out, lab); return; }
      var captured = "";
      var config = { stdio: { write: function(s){ captured += s; } } };
      var input = lab.getAttribute("data-stdin")||"";
      JSCPP.run(code, input, config);
      show(out, escapeHtml(captured.length?captured:"(no output)"), false);
    }catch(e){
      // JSCPP cannot handle some modern C++ - show fallback
      fallback(out, lab);
    }
  }

  // ---------- Python via Pyodide ----------
  var pyodidePromise = null;
  function getPyodide(out){
    if(!pyodidePromise){
      show(out, '<span class="muted">Loading Python (first run only, this can take ~10-20s)...</span>', false);
      pyodidePromise = loadPyodide();
    }
    return pyodidePromise;
  }
  async function runPython(code, out, lab){
    try{
      var py = await getPyodide(out);
      py.runPython("import sys, io\n_buf = io.StringIO()\nsys.stdout = _buf\nsys.stderr = _buf");
      try{
        py.runPython(code);
      }catch(err){
        py.runPython("sys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__");
        var partial = py.runPython("_buf.getvalue()");
        show(out, escapeHtml(partial)+'\n'+escapeHtml(String(err.message||err).split("\n").slice(-4).join("\n")), true);
        return;
      }
      py.runPython("sys.stdout = sys.__stdout__\nsys.stderr = sys.__stderr__");
      var text = py.runPython("_buf.getvalue()");
      show(out, escapeHtml(text.length?text:"(no output)"), false);
    }catch(e){
      show(out, escapeHtml("Could not start Python: "+(e.message||e)), true);
    }
  }

  function run(lang, code, out, lab){
    if(lang==="python") runPython(code, out, lab);
    else runCpp(code, out, lab);
  }
})();

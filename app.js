const $=id=>document.getElementById(id);

let bank=(typeof QUESTIONS!=="undefined"&&Array.isArray(QUESTIONS))?QUESTIONS:[];
let session=[],idx=0,score=0,answered=false,mode="training",answers=[],lastSession=[],timerId=null,timeLeft=0;

const getWrong=()=>JSON.parse(localStorage.getItem("netplus_wrong")||"[]");
const saveWrong=a=>localStorage.setItem("netplus_wrong",JSON.stringify([...new Set(a)]));
const getStats=()=>JSON.parse(localStorage.getItem("netplus_stats")||'{"attempts":0,"correct":0,"total":0,"best":0,"mockAttempts":0,"mockBest":0}');
const getHistory=()=>JSON.parse(localStorage.getItem("netplus_history")||"[]");
const saveHistory=h=>localStorage.setItem("netplus_history",JSON.stringify(h.slice(-20)));

function refreshHome(){
  const s=getStats();
  $("totalCount").textContent=bank.length+"問";
  $("best").textContent=(s.best||0)+"%";
  $("wrongCount").textContent=getWrong().length+"問";
}
function hideAll(){
  ["home","quiz","result","stats","guide"].forEach(x=>$(x).classList.add("hide"));
}
function goHome(){
  stopTimer();hideAll();$("home").classList.remove("hide");refreshHome();
}
function showGuide(){hideAll();$("guide").classList.remove("hide")}
function pick(n,d,randomize=true){
  let a=bank.filter(q=>d==="all"||q.domain===d);
  if(randomize)a.sort(()=>Math.random()-.5);
  return a.slice(0,Math.min(n,a.length));
}
function startQuiz(random=false){
  stopTimer();mode="training";
  const n=+$("count").value,d=$("domain").value;
  session=pick(n,d,true);
  if(!session.length){alert("問題データを読み込めません。");return}
  idx=0;score=0;answers=[];lastSession=session;
  hideAll();$("quiz").classList.remove("hide");
  $("modeBadge").classList.add("hide");$("timer").classList.add("hide");
  render();
}
function startWrong(){
  stopTimer();
  mode="wrong";
  const ids=JSON.parse(localStorage.getItem("netplus_wrong")||"[]");
  const unique=[...new Set(ids)];
  const wrongBank=unique.map(id=>bank.find(q=>String(q.id)===String(id))).filter(Boolean);

  if(!wrongBank.length){
    alert("現在、間違い保存されている問題はありません。");
    return;
  }

  session=wrongBank.sort(()=>Math.random()-.5);
  current=0;
  score=0;
  showQuiz();
  renderQuestion();
}
function startMock(){
  if(bank.length<90){alert("問題データが90問未満です。");return}
  stopTimer();mode="mock";session=pick(90,"all",true);
  idx=0;score=0;answers=new Array(session.length).fill(null);lastSession=session;
  hideAll();$("quiz").classList.remove("hide");
  $("modeBadge").classList.remove("hide");$("timer").classList.remove("hide");
  startTimer(90*60);render();
}
function startTimer(seconds){
  timeLeft=seconds;updateTimer();
  timerId=setInterval(()=>{
    timeLeft--;updateTimer();
    if(timeLeft<=0){stopTimer();finishMock(true)}
  },1000);
}
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null}}
function updateTimer(){
  const m=Math.floor(Math.max(0,timeLeft)/60),s=Math.max(0,timeLeft)%60;
  $("timer").textContent=`残り ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  $("timer").classList.toggle("ok",timeLeft>600);
}
function render(){
  answered=false;
  $("next").disabled=(mode!=="mock");
  $("explain").classList.add("hide");
  const q=session[idx];
  $("qno").textContent=`${idx+1} / ${session.length}`;
  $("qdomain").textContent=q.domain;
  $("bar").style.width=((idx+1)/session.length*100)+"%";
  $("qtext").textContent=q.q;
  const w=$("options");w.innerHTML="";
  q.o.forEach((o,i)=>{
    const b=document.createElement("button");
    b.className="option";b.textContent=`${String.fromCharCode(65+i)}. ${o}`;
    if(mode==="mock"&&answers[idx]===i)b.classList.add("selected");
    b.onclick=()=>answer(i);w.appendChild(b);
  });
  $("next").textContent=idx===session.length-1?"結果を見る ▶":"次の問題 ▶";
}
function answer(choice){
  const q=session[idx];
  if(mode==="mock"){
    answers[idx]=choice;
    [...$("options").children].forEach((b,i)=>b.classList.toggle("selected",i===choice));
    $("next").disabled=false;return;
  }
  if(answered)return;
  answered=true;
  const bs=[...$("options").children];
  bs.forEach((b,i)=>{
    b.disabled=true;
    if(i===q.a)b.classList.add("correct");
    if(i===choice&&choice!==q.a)b.classList.add("wrong");
  });
  if(choice===q.a){
    score++;
    saveWrong(getWrong().filter(id=>id!==q.id));
  }else{
    saveWrong([...getWrong(),q.id]);
  }
  $("explain").textContent=(choice===q.a?"⭕ 正解！ ":"❌ 不正解。 ")+"解説："+q.e;
  $("explain").classList.remove("hide");
  $("next").disabled=false;
}
function nextQuestion(){
  if(mode==="mock"){
    if(idx<session.length-1){idx++;render()}else finishMock(false);
    return;
  }
  if(!answered)return;
  if(idx<session.length-1){idx++;render()}else finishTraining();
}
function finishTraining(){
  const pct=Math.round(score/session.length*100),s=getStats();
  s.attempts++;s.correct+=score;s.total+=session.length;s.best=Math.max(s.best||0,pct);
  localStorage.setItem("netplus_stats",JSON.stringify(s));
  saveHistory([...getHistory(),{type:mode==="wrong"?"間違い復習":"練習",date:new Date().toLocaleString("ja-JP"),score,total:session.length,pct}]);
  hideAll();$("result").classList.remove("hide");
  const remaining=getWrong().length;
  $("resultText").innerHTML=mode==="wrong"
    ?`<div class="stat"><span>間違い復習</span><b>${score} / ${session.length}</b></div>
      <div class="stat"><span>正解率</span><b>${pct}%</b></div>
      <div class="stat"><span>残りの間違い問題</span><b>${remaining}問</b></div>
      <p>${remaining===0?"🎉 間違い問題をすべてクリアしました！":"💪 残っている問題をもう一度復習しよう！"}</p>`
    :`<div class="stat"><span>正解</span><b>${score} / ${session.length}</b></div>
      <div class="big">${pct}%</div>
      <p>${pct>=80?"🔥 かなり良い！":"💪 間違い復習でもう一周しよう！"}</p>`;
  refreshHome();
}
function finishMock(timeout){
  stopTimer();
  score=answers.reduce((n,a,i)=>n+(a===session[i].a?1:0),0);
  const pct=Math.round(score/session.length*100),s=getStats();
  s.mockAttempts=(s.mockAttempts||0)+1;s.mockBest=Math.max(s.mockBest||0,pct);
  s.attempts++;s.correct+=score;s.total+=session.length;s.best=Math.max(s.best||0,pct);
  localStorage.setItem("netplus_stats",JSON.stringify(s));
  saveHistory([...getHistory(),{type:"模擬試験",date:new Date().toLocaleString("ja-JP"),score,total:session.length,pct,timeout:!!timeout}]);
  hideAll();$("result").classList.remove("hide");
  $("resultText").innerHTML=`<div class="stat"><span>模擬試験</span><b>${timeout?"⏰ 時間切れ":"完了"}</b></div>
    <div class="stat"><span>正解</span><b>${score} / ${session.length}</b></div>
    <div class="big">${pct}%</div>
    <button class="primary" onclick="showMockReview()">📖 全問題の解説を見る</button>`;
  refreshHome();
}
function showMockReview(){
  let html="";
  session.forEach((q,i)=>{
    const a=answers[i],ok=a===q.a;
    html+=`<div class="review-item"><div class="review-q">${i+1}. ${q.q}</div>
      <div class="${ok?"review-ok":"review-ng"}">${a===null?"未回答":(ok?"⭕ 正解":"❌ 不正解")}</div>
      <div class="small">正解：${String.fromCharCode(65+q.a)}. ${q.o[q.a]}</div>
      <div class="explain">${q.e}</div></div>`;
  });
  hideAll();
  $("guide").classList.remove("hide");
  $("guide").innerHTML=`<h2>📖 模擬試験の解説</h2>${html}<button class="primary" onclick="goHome()">🏠 メニューへ</button>`;
}
function restart(){
  if(mode==="mock")startMock();
  else if(mode==="wrong")startWrong();
  else startQuiz(false);
}
function showStats(){
  stopTimer();
  hideAll();
  $("statsSection").style.display="block";

  const s=JSON.parse(localStorage.getItem("netplus_stats")||'{"total":0,"correct":0,"best":0,"mock":0,"mockBest":0}');
  const h=JSON.parse(localStorage.getItem("netplus_history")||"[]");
  const wrong=JSON.parse(localStorage.getItem("netplus_wrong")||"[]");

  const total=Number(s.total)||0;
  const correct=Number(s.correct)||0;
  const accuracy=total?Math.round(correct/total*100):0;
  const best=Math.max(Number(s.best)||0,accuracy);
  const mockCount=Number(s.mock)||0;
  const mockBest=Number(s.mockBest)||0;
  const practiceCount=h.filter(x=>x && x.mode!=="mock").length;

  const domains=[
    "ネットワークの基礎",
    "ネットワークの実装",
    "ネットワークの運用",
    "ネットワークセキュリティ",
    "トラブルシューティング"
  ];
  const dm={};
  domains.forEach(d=>dm[d]={n:0,c:0});
  h.forEach(x=>{
    if(x && dm[x.domain]){
      dm[x.domain].n += Number(x.count)||0;
      dm[x.domain].c += Number(x.correct)||0;
    }
  });

  $("statsContent").innerHTML =
    '<div class="stats-grid">'+
    card("📚 累計学習問題",total,"問")+
    card("🎯 累計正解率",accuracy,"%")+
    card("🏆 最高正解率",best,"%")+
    card("📖 学習回数",practiceCount,"回")+
    card("📝 模擬試験",mockCount,"回")+
    card("⭐ 模試最高得点",mockBest,"%")+
    card("❌ 間違い保存",wrong.length,"問")+
    '</div>'+
    '<h3 class="stats-title">📚 分野別成績</h3>'+
    '<div class="domain-stats">'+domains.map(function(d){
      const v=dm[d], pct=v.n?Math.round(v.c/v.n*100):0;
      return '<div class="domain-row"><div class="domain-name">'+d+
        '</div><div class="domain-bar"><span style="width:'+pct+'%"></span></div>'+
        '<div class="domain-percent">'+pct+'%</div><div class="domain-detail">'+
        (v.n?(v.c+'/'+v.n+'問'):"まだ記録なし")+'</div></div>';
    }).join("")+'</div>'+
    '<h3 class="stats-title">🕒 最近の学習履歴</h3>'+
    '<div class="history-list">'+
    (h.slice(0,20).map(function(x){
      const pct=Number(x.percent!=null?x.percent:(x.accuracy||0));
      const label=x.mode==="mock"?"📝 模擬試験":"📚 練習";
      const detail=x.count!=null?((x.correct||0)+"/"+x.count+"問"):"";
      return '<div class="history-row"><span>'+label+'</span><span>'+detail+
        '</span><b>'+pct+'%</b><small>'+(x.date||x.time||"")+'</small></div>';
    }).join("") || '<div class="empty-history">まだ学習履歴がありません。</div>')+
    '</div>'+
    '<button class="reset-stats-btn" id="resetStatsBtn">🗑 成績をリセット</button>';

  const rb=document.getElementById("resetStatsBtn");
  if(rb) rb.onclick=function(){
    if(confirm("成績と学習履歴をリセットしますか？")){
      localStorage.removeItem("netplus_stats");
      localStorage.removeItem("netplus_history");
      showStats();
    }
  };
}
function card(label,value,unit){
  return '<div class="stat-card"><div class="stat-label">'+label+
    '</div><div class="stat-value">'+value+'</div><div class="stat-sub">'+unit+'</div></div>';
}

function resetData(){
  if(!confirm("成績・間違い問題・成績履歴をすべてリセットします。\n\n本当にリセットしますか？"))return;
  localStorage.removeItem("netplus_stats");localStorage.removeItem("netplus_wrong");localStorage.removeItem("netplus_history");
  alert("✅ 成績と間違い問題をリセットしました。");showStats();
}

refreshHome();

/* 初回ガイド */
(function(){
  const KEY="netplus_guide_seen";
  const overlay=document.getElementById("firstGuide");
  const btn=document.getElementById("guideStart");
  const check=document.getElementById("guideDontShow");
  if(!overlay || !btn) return;

  function openGuide(){ overlay.style.display="flex"; }
  function closeGuide(){
    overlay.style.display="none";
    if(check && check.checked) localStorage.setItem(KEY,"1");
  }

  btn.addEventListener("click", closeGuide);

  // 既存の「使い方」ボタンがあれば、いつでもガイドを開けるようにする
  document.addEventListener("click", function(e){
    const el=e.target.closest("button,a");
    if(!el) return;
    const t=(el.textContent||"").trim();
    if(t.includes("使い方") && !el.closest("#firstGuide")){
      e.preventDefault();
      openGuide();
    }
  });

  if(localStorage.getItem(KEY)!=="1"){
    setTimeout(openGuide,180);
  }
})();

/* 間違い復習 強化 */
(function(){
  function wrongCount(){
    try{
      return [...new Set(JSON.parse(localStorage.getItem("netplus_wrong")||"[]"))].length;
    }catch(e){ return 0; }
  }
  function updateWrongBadge(){
    const buttons=[...document.querySelectorAll("button,a")];
    buttons.forEach(el=>{
      const t=(el.textContent||"").trim();
      if(t.includes("間違い復習") && !el.querySelector(".wrong-badge")){
        const b=document.createElement("span");
        b.className="wrong-badge";
        el.appendChild(b);
      }
      if(t.includes("間違い復習")){
        const b=el.querySelector(".wrong-badge");
        if(b) b.textContent=wrongCount();
      }
    });
  }
  document.addEventListener("click",function(){
    setTimeout(updateWrongBadge,50);
  });
  setInterval(updateWrongBadge,1000);
  setTimeout(updateWrongBadge,300);
})();

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
  stopTimer();mode="wrong";
  const ids=getWrong(),n=+$("count").value;
  session=bank.filter(q=>ids.includes(q.id)).sort(()=>Math.random()-.5).slice(0,n);
  if(!session.length){alert("間違い問題はまだありません。まず問題を解いてみよう！");return}
  idx=0;score=0;answers=[];lastSession=session;
  hideAll();$("quiz").classList.remove("hide");
  $("modeBadge").classList.add("hide");$("timer").classList.add("hide");
  render();
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
  const s=getStats(),h=getHistory().slice().reverse(),rate=s.total?Math.round(s.correct/s.total*100):0;
  hideAll();$("stats").classList.remove("hide");
  $("statsBody").innerHTML=`<div class="stat"><span>受験回数</span><b>${s.attempts}</b></div>
    <div class="stat"><span>累計正解率</span><b>${rate}%</b></div>
    <div class="stat"><span>最高正解率</span><b>${s.best||0}%</b></div>
    <div class="stat"><span>模擬試験回数</span><b>${s.mockAttempts||0}</b></div>
    <div class="stat"><span>模擬試験最高</span><b>${s.mockBest||0}%</b></div>
    <div class="stat"><span>間違い保存</span><b>${getWrong().length}問</b></div>`;
  $("history").innerHTML="<h3>📚 最近の成績（最大20件）</h3>"+(h.length?h.map(x=>
    `<div class="history-row"><span>${x.type}<br><span class="small">${x.date}${x.timeout?"・時間切れ":""}</span></span><b>${x.score}/${x.total}<br>${x.pct}%</b></div>`).join(""):"<p class='small'>まだ成績がありません。</p>");
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

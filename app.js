const app=document.getElementById("app");
let state=JSON.parse(localStorage.getItem("netplusState")||'{"correct":0,"answered":0,"attempts":0,"best":0,"wrong":[]}');
let current=[],idx=0,score=0,mode="practice";

function save(){localStorage.setItem("netplusState",JSON.stringify(state))}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function home(){
 app.innerHTML=`<header><h1>🌐 Network+ N10-009</h1><p>学習アプリ</p></header>
 <main class="menu">
 <button onclick="start('practice')">📚 練習問題</button>
 <button onclick="start('mock')">🧪 模擬試験</button>
 <button onclick="wrong()">❌ 間違えた問題</button>
 <button onclick="stats()">📊 成績</button>
 <section><h2>収録問題</h2><p>現在 ${QUESTIONS.length} 問のサンプルを収録しています。</p><p class="note">500問版では、この問題データを拡張して使用します。</p></section>
 </main>`;
}
function start(m){
 mode=m; current=shuffle(QUESTIONS); if(m==="mock") current=current.slice(0,Math.min(90,current.length));
 idx=0;score=0;showQ();
}
function showQ(){
 if(idx>=current.length){finish();return}
 let x=current[idx];
 app.innerHTML=`<header><button class="back" onclick="home()">←</button><span>${mode==="mock"?"模擬試験":"練習問題"}</span><span>${idx+1}/${current.length}</span></header>
 <main><div class="domain">${x.domain}</div><h2>${x.q}</h2><div class="opts">${x.o.map((v,i)=>`<button onclick="answer(${i})">${String.fromCharCode(65+i)}. ${v}</button>`).join("")}</div></main>`;
}
function answer(n){
 const x=current[idx], ok=n===x.a;
 state.answered++; if(ok){score++;state.correct++}else if(!state.wrong.includes(x.id))state.wrong.push(x.id); save();
 app.innerHTML=`<header><span>${ok?"✅ 正解":"❌ 不正解"}</span></header><main>
 <div class="${ok?"correct":"incorrect"}>${ok?"正解！":"不正解"}</div>
 <h2>${x.q}</h2><p>正解：<b>${x.o[x.a]}</b></p><div class="explain">💡 ${x.e}</div>
 <button onclick="idx++;showQ()">次の問題 →</button></main>`;
}
function finish(){
 state.attempts++; let pct=Math.round(score/current.length*100); if(pct>state.best)state.best=pct;save();
 app.innerHTML=`<header><h1>結果</h1></header><main class="result"><h2>${score} / ${current.length}</h2><div class="big">${pct}%</div><button onclick="home()">ホームへ</button></main>`;
}
function wrong(){
 current=shuffle(QUESTIONS.filter(q=>state.wrong.includes(q.id))); if(!current.length){alert("間違えた問題はありません。");return} idx=0;score=0;mode="wrong";showQ();
}
function stats(){
 const pct=state.answered?Math.round(state.correct/state.answered*100):0;
 app.innerHTML=`<header><button class="back" onclick="home()">←</button><h1>📊 成績</h1></header><main class="stats">
 <p>回答数 <b>${state.answered}</b></p><p>累計正解率 <b>${pct}%</b></p><p>最高正解率 <b>${state.best}%</b></p><p>模擬試験回数 <b>${state.attempts}</b></p><p>間違い保存 <b>${state.wrong.length}問</b></p>
 <button onclick="state={correct:0,answered:0,attempts:0,best:0,wrong:[]};save();stats()">成績をリセット</button></main>`;
}
home();
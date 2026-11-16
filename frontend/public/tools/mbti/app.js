(function () {
  'use strict';
  const Q = window.QUESTIONNAIRE;
  const E = window.QuizEngine;
  const STORAGE_KEY = 'jabdonsani-mbti-v2';
  const LEGACY_STORAGE_KEY = 'jabdonsani-mbti-v1';
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modal-body');
  const arrow = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const label = value => Q.scale.find(x => x.value === value)?.label || '미응답';
  let storageOK = true;
  let filterMissing = false;
  let toastTimer;
  function emptyState() {
    return {version:Q.version, answers:{}, tieAnswers:{}, cursor:0, screen:'intro', startedAt:null, finishedAt:null, wordingReview:false};
  }
  let state = emptyState();
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(current || localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    const isLegacy = !current && stored?.version === 'jung-eight-64-v1';
    if (stored && (stored.version === Q.version || isLegacy) && stored.answers && typeof stored.answers === 'object' && !Array.isArray(stored.answers)) {
      Q.items.forEach(item => { const n = stored.answers[item.q]; if (Number.isInteger(n) && n >= 1 && n <= 5) state.answers[item.q] = n; });
      state.cursor = Number.isInteger(stored.cursor) ? Math.max(0, Math.min(63, stored.cursor)) : 0;
      state.startedAt = typeof stored.startedAt === 'string' ? stored.startedAt : null;
      state.wordingReview = isLegacy ? E.responseCount(state.answers) > 0 : stored.wordingReview === true;
      if (!isLegacy) {
        ['EI','SN','TF','JP'].forEach(key => {
          const value=stored.tieAnswers?.[key];
          if (typeof value === 'string' && value.length === 1 && key.includes(value)) state.tieAnswers[key]=value;
        });
        state.finishedAt = typeof stored.finishedAt === 'string' && !isNaN(Date.parse(stored.finishedAt)) ? stored.finishedAt : null;
      }
      if (state.wordingReview) state.screen='review';
      else if (E.isComplete(state.answers) && (state.finishedAt || stored.screen === 'tie')) {
        state.screen=E.estimateType(state.answers,state.tieAnswers).resolved ? 'results' : 'tie';
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) { storageOK = false; }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageOK = true; }
    catch (_) { storageOK = false; }
  }
  function count() { return E.responseCount(state.answers); }
  function toast(message) {
    const node = document.getElementById('toast');
    node.textContent = message; node.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3000);
  }
  function storageLabel() { return storageOK ? '이 브라우저에 자동 저장' : '현재 창에서만 응답 유지'; }
  function wordingNotice() {
    return state.wordingReview ? '<div class="notice wording-notice"><strong>질문을 더 짧고 쉽게 바꿨습니다.</strong><p>저장된 답변은 그대로 가져왔어요. 바뀐 문장을 확인한 뒤 결과를 보세요.</p></div>' : '';
  }
  function closeModal() { if (modal.open) modal.close(); }
  function showModal(html) { modalBody.innerHTML = html; if (!modal.open) modal.showModal(); }
  function renderHeader() {
    const n = count();
    document.getElementById('header-actions').innerHTML = state.screen === 'intro'
      ? '<span class="pill">일상 판단 방식 · 64문항</span>'
      : `<span class="header-progress">${n} / 64 응답</span><button class="btn btn-ghost btn-small" data-action="review">응답 모아보기</button>`;
  }
  function navigate(screen, focus = true) {
    state.screen = screen; persist(); render();
    window.scrollTo({top:0, behavior:'instant'});
    if (focus) app.querySelector('h1')?.focus({preventScroll:true});
  }
  function gotoQuestion(q) {
    closeModal(); state.cursor = Math.max(0, Math.min(63, q - 1));
    if (!state.startedAt) state.startedAt = new Date().toISOString();
    navigate('quiz');
  }
  function intro() {
    const n = count();
    return `<div class="shell intro-shell">
      <section class="intro-grid">
        <div class="hero"><p class="eyebrow">A MOMENT TO NOTICE YOURSELF</p>
          <h1 tabindex="-1">나는 무엇을<br>먼저 떠올릴까<span class="accent-dot">.</span></h1>
          <p class="hero-description">일상 속 짧은 질문에 답하고,<br>나의 <strong>네 글자 추정 유형</strong>을 확인해 보세요.<br>어떤 생각을 먼저 하는지도 함께 살펴봅니다.</p>
          <div class="hero-actions"><button class="btn btn-primary" data-action="start">${n ? '이어서 응답하기' : '검사 시작하기'} ${arrow}</button>${n ? '<button class="btn btn-ghost" data-action="review">지금까지의 응답 보기</button>' : ''}</div>
          ${n ? `<p class="resume-note">${n}개 문항에 답한 내용을 이어서 볼 수 있습니다.${storageOK ? '' : ' 이 창을 닫으면 응답이 사라질 수 있습니다.'}</p>` : ''}
          <div class="intro-stats"><div class="stat"><b>64</b><span>일상 속 질문</span></div><div class="stat"><b>5</b><span>선택의 정도</span></div><div class="stat"><b>내 속도로</b><span>수정 · 건너뛰기 가능</span></div></div>
        </div>
        <div class="intro-art" aria-hidden="true"><span class="art-label">THE WAY YOU THINK</span><div class="orbit-graphic"><i></i><i></i><i></i><i></i><span class="orbit-center"></span></div><p class="art-title">작은 선택을 따라,<br><strong>나의 기준을 발견하다.</strong></p><span class="art-note">작은 선택에서 발견하는 나의 기준</span></div>
      </section>
      <section class="intro-bottom surface"><div class="section-heading"><h2>시작하기 전에</h2><span class="muted">정답은 없습니다</span></div><div class="steps">
        <div class="step"><span class="step-number">01</span><h3>평소의 나를 떠올리세요</h3><p>최근 6개월을 생각해 주세요. 해야 한다고 느끼는 모습보다 평소 자연스럽게 하는 생각을 기준으로 답해 주세요.</p></div>
        <div class="step"><span class="step-number">02</span><h3>더 가까운 쪽을 고르세요</h3><p>어느 쪽이 더 좋은 답은 아닙니다. 문장이 나와 얼마나 가까운지 1~5점으로 골라 주세요.</p></div>
        <div class="step"><span class="step-number">03</span><h3>어렵다면 잠시 건너뛰세요</h3><p>3점은 ‘어느 쪽도 아니다’입니다. 바로 답하기 어렵다면 건너뛴 뒤 다시 생각해도 됩니다.</p></div>
      </div></section>
      <div class="intro-footnotes"><p class="helper">${storageLabel()}. 응답은 이 앱의 서버로 전송되지 않습니다.</p><p class="helper">직접 만든 자기이해용 질문지입니다. 공식 MBTI 검사는 아니며, 결과의 신뢰도와 정확도는 아직 검증되지 않았습니다.</p></div>
    </div>`;
  }
  function quiz() {
    const item = Q.items[state.cursor]; const response = state.answers[item.q]; const n = count();
    return `<div class="shell quiz-shell"><div class="quiz-top"><button class="btn btn-ghost btn-small" data-action="home">← 안내</button><button class="btn btn-ghost btn-small" data-action="map">문항 이동 <span aria-hidden="true">▦</span></button></div>
      <div class="progress-meta"><span>문항 <b>${String(item.q).padStart(2,'0')}</b> / 64</span><span id="answered-label">${n}개 응답 완료</span></div>
      <div class="progress-track" role="progressbar" aria-label="전체 응답 진행률" aria-valuemin="0" aria-valuemax="64" aria-valuenow="${n}"><span style="width:${n / 64 * 100}%"></span></div>
      ${wordingNotice()}<section class="question-card"><p class="question-number">Q${item.q}</p><h1 class="question-text" id="question-title" tabindex="-1">${escape(item.text)}</h1>
        <fieldset class="likert-fieldset" aria-labelledby="question-title"><legend class="sr-only">나와 가까운 정도를 선택하세요</legend><div class="likert-options">
          ${Q.scale.map(option => `<label class="likert-option"><input type="radio" name="answer" value="${option.value}" ${response === option.value ? 'checked' : ''}><span class="option-box"><span class="option-number">${option.value}</span><span class="option-label">${escape(option.label)}</span></span></label>`).join('')}
        </div></fieldset>
        <div class="question-note"><span id="selection-note">${response ? `${response}점 · ${label(response)}` : '지금의 나와 가까운 정도를 선택해 주세요.'}</span><button class="btn btn-ghost btn-small" data-action="clear" id="clear-answer" ${response ? '' : 'hidden'}>선택 지우기</button></div>
      </section>
      <div class="quiz-nav"><div class="nav-left"><button class="btn btn-secondary" data-action="previous" ${state.cursor === 0 ? 'disabled' : ''}>이전 문항</button></div><div class="nav-right"><button class="btn btn-ghost" data-action="skip">나중에 답하기</button><button class="btn btn-primary" data-action="next" id="next-question" ${response ? '' : 'disabled'}>${state.cursor === 63 ? '응답 확인하기' : '다음 문항'} ${arrow}</button></div></div>
      <div class="footer-hint"><span id="storage-label">${storageLabel()}</span><span class="keyboard-hint">숫자 <kbd>1</kbd>–<kbd>5</kbd> 선택 · <kbd>Enter</kbd> 다음</span></div>
      <p class="helper quiz-help">상황을 떠올리기 어렵다면 건너뛰세요. 결과는 64문항에 모두 응답한 뒤 확인할 수 있습니다.</p>
    </div>`;
  }
  function questionGrid() {
    return `<div class="question-grid">${Q.items.map(item => `<button class="${state.answers[item.q] ? 'answered' : 'unanswered'} ${state.screen === 'quiz' && item.q === state.cursor + 1 ? 'current' : ''}" data-action="question" data-q="${item.q}" aria-label="${item.q}번, ${state.answers[item.q] ? '응답 ' + state.answers[item.q] + '점' : '미응답'}">${item.q}${state.answers[item.q] ? '<span class="sr-only"> 응답 완료</span>' : ''}</button>`).join('')}</div>`;
  }
  function review() {
    const n=count();
    const items=Q.items.filter(item => !filterMissing || !state.answers[item.q]);
    return `<div class="shell review-shell"><div class="review-header"><div><p class="eyebrow">CHECK YOUR RESPONSES</p><h1 tabindex="-1">나의 응답 돌아보기</h1><p class="muted">${n === 64 ? '모든 문항에 답했습니다. 응답을 확인하고 결과를 열어 보세요.' : `${64-n}개 문항이 남아 있습니다. 문항을 눌러 이어서 답해 주세요.`}</p></div><span class="review-count"><b>${n}</b> / 64</span></div>
      ${wordingNotice()}<section class="surface review-map">${questionGrid()}<p class="helper">채워진 칸은 응답 완료 · 숫자를 누르면 해당 문항으로 이동합니다.</p></section>
      <div class="review-actions"><button class="btn btn-secondary" data-action="${n===64?'start':'missing'}">${n===64?'응답 수정하기':'미응답부터 이어서'} ${arrow}</button><button class="btn btn-primary" data-action="finish" ${n<64?'disabled':''}>${n===64?'내 결과 확인하기':`${64-n}개 문항을 더 응답해 주세요`} ${n===64?arrow:''}</button></div>
      <div class="review-toolbar"><h2>문항별 응답</h2><label class="filter-switch"><input type="checkbox" id="filter-missing" ${filterMissing?'checked':''}> 미응답만 보기</label></div><div class="review-list">${items.length ? items.map(item => `<button class="review-item" data-action="question" data-q="${item.q}"><span class="review-q">Q${String(item.q).padStart(2,'0')}</span><span class="review-text">${escape(item.text)}</span><span class="response-pill ${state.answers[item.q]?'has-answer':''}">${state.answers[item.q] ? state.answers[item.q]+'점' : '미응답'}</span></button>`).join('') : '<div class="surface empty-state">미응답 문항이 없습니다.</div>'}</div>
      <p class="helper">응답 내용을 눌러 언제든 수정할 수 있습니다.</p></div>`;
  }
  function resultDate() {
    const value = state.finishedAt ? new Date(state.finishedAt) : new Date();
    return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(value);
  }
  function scoreRow(item) {
    return `<div class="score-row"><div class="score-head"><span class="score-label"><span class="function-code">${item.code}</span><span>${escape(item.shortName)}</span></span><span class="score-value">${item.displayMean}<small> / 5</small></span></div><div class="score-track" role="img" aria-label="${escape(item.name)}, 평균 ${item.displayMean}점, 척도 1에서 5"><span class="score-fill" style="width:${(item.mean-1)/4*100}%"></span></div></div>`;
  }
  function tieStep() {
    const estimate=E.estimateType(state.answers,state.tieAnswers);
    if(!estimate.complete){state.screen='review';return review();}
    if(estimate.resolved){state.screen='results';return results();}
    const next=estimate.nextTie;
    return `<div class="shell quiz-shell tie-shell">
      <div class="quiz-top"><button class="btn btn-ghost btn-small" data-action="review">← 응답 돌아보기</button><span class="pill">64문항 응답 완료</span></div>
      <section class="question-card tie-card"><p class="question-number">마지막 선택 ${estimate.tieUsed.length+1}</p>
        <p class="tie-intro">같은 점수로 나온 유형이 있어요.<br>두 문장 중 평소 나에게 더 가까운 쪽을 골라 주세요.</p>
        <h1 class="question-text" tabindex="-1">${escape(next.prompt)}</h1>
        <div class="tie-options">${next.options.map((option,i)=>`<button class="tie-option" data-action="tie-choice" data-dimension="${next.dimension}" data-value="${option.value}"><span class="tie-option-letter" aria-hidden="true">${i===0?'A':'B'}</span><span>${escape(option.text)}</span>${arrow}</button>`).join('')}</div>
        <p class="helper">필요한 경우에만 최대 4번 선택합니다. 앞서 답한 64문항의 점수는 그대로 유지됩니다.</p>
      </section>
      ${estimate.tieUsed.length ? '<button class="btn btn-ghost tie-back" data-action="tie-back">← 이전 선택 바꾸기</button>' : ''}
    </div>`;
  }
  function typeCard(estimate) {
    const selected=estimate.selected;
    const letters={E:'외향',I:'내향',S:'감각',N:'직관',T:'사고',F:'감정',J:'판단',P:'인식'};
    const near=estimate.nearCandidates.filter(x=>x.code!==estimate.type).slice(0,3);
    return `<section class="type-card" aria-labelledby="estimated-type"><div class="type-main"><p class="type-eyebrow">나의 추정 MBTI</p><h2 class="type-code" id="estimated-type">${escape(estimate.type)}</h2><div class="type-letters">${estimate.type.split('').map(letter=>`<span>${letter} · ${letters[letter]}</span>`).join('')}</div></div><div class="type-description"><p class="type-lead">이번 응답에서 가장 가까운 유형입니다.</p><p>${escape(selected.description)}</p>
      ${estimate.tieUsed.length ? `<p class="type-context">동점 후보 중 마지막 선택 ${estimate.tieUsed.length}개를 반영해 추정했어요.</p><button class="btn btn-secondary btn-small" data-action="redo-tie">마지막 선택 다시 하기</button>` : near.length ? `<p class="type-context">${near.map(x=>escape(x.code)).join(' · ')}${near.length===1?'와도':' 유형도'} 비교 점수가 비슷해요. 응답이 조금 바뀌면 다른 유형이 나올 수 있습니다.</p>` : ''}
      <p class="type-caveat">8가지 기능 점수를 자체 규칙으로 비교한 참고 결과입니다. 공식 MBTI 검사 결과는 아닙니다.</p>
    </div></section>`;
  }
  function results() {
    const result=E.score(state.answers);
    if(!result.complete) { state.screen='review'; return review(); }
    const estimate=E.estimateType(state.answers,state.tieAnswers);
    if(!estimate.resolved) {state.screen='tie';return tieStep();}
    return `<div class="shell results-shell"><div class="results-top"><div class="results-heading"><p class="eyebrow">YOUR RESULT</p><h1 tabindex="-1">나의 검사 결과</h1><p class="muted">네 글자 유형과, 그 안에 담긴 나의 생각 습관을 살펴보세요.</p><div class="result-meta"><span class="pill">64 / 64 응답 완료</span><span>${escape(resultDate())} · 한국 시간</span></div></div><div class="results-actions"><button class="btn btn-secondary btn-small" data-action="copy">결과 복사</button><button class="btn btn-secondary btn-small" data-action="download">결과 내려받기</button></div></div>
      ${typeCard(estimate)}
      <div class="section-heading"><h2>나의 8가지 기능 점수</h2><span class="muted">문항별 점수의 평균 · 1.00–5.00</span></div>
      <div class="score-grid"><section class="score-panel"><p class="eyebrow">PERCEPTION</p><h3>정보를 받아들이는 기준</h3>${result.functions.slice(0,4).map(scoreRow).join('')}<div class="score-axis"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></section><section class="score-panel"><p class="eyebrow">JUDGMENT</p><h3>선택을 정리하는 기준</h3>${result.functions.slice(4).map(scoreRow).join('')}<div class="score-axis"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></section></div>
      <p class="result-note">점수가 높을수록 그 방식의 문항에 더 동의한 것입니다. 능력 점수는 아닙니다. 3점은 이 질문지의 중간값이며, 사람들의 평균을 뜻하지 않습니다.</p>
      <div class="section-heading details-heading"><h2>점수에 담긴 나의 응답</h2><span class="muted">영역을 펼치면 해석과 채점 근거를 볼 수 있어요</span></div><div class="detail-grid">
      ${result.functions.map(item=>`<details class="function-card"><summary class="function-summary"><span class="function-code">${item.code}</span><span class="function-summary-name"><strong>${escape(item.name)}</strong><small>${escape(item.shortName)}</small></span><b>${item.displayMean}</b><span class="details-chevron" aria-hidden="true">⌄</span></summary><div class="function-body"><p>${escape(item.definition)}</p><div class="reflection"><span>돌아볼 질문</span><p>${escape(item.reflection)}</p></div><p class="helper">아래 8문항의 환산 점수 합 ${item.total} ÷ 8 = ${item.displayMean}점</p><div class="evidence-list">${result.responses.filter(row=>row.function===item.code).map(row=>`<details class="evidence-row"><summary><span>Q${row.q}</span><span class="evidence-question">${escape(row.text)}</span><span class="response-pill">${row.response}점</span></summary><div class="evidence-detail"><p><b>선택한 답:</b> ${row.response}점 · ${escape(label(row.response))}</p><p><b>채점:</b> ${row.reverse?'역채점 · 6 − '+row.response+' = '+row.adjusted:'정채점 · '+row.adjusted}점</p><button class="btn btn-ghost btn-small" data-action="question" data-q="${row.q}">이 문항 수정하기 ${arrow}</button></div></details>`).join('')}</div></div></details>`).join('')}
      </div><section class="method-notes surface"><h2>결과는 이렇게 읽어 주세요</h2><p>이 유형은 이번 응답을 바탕으로 한 추정입니다. 질문지와 유형 계산법의 신뢰도·타당도는 아직 검증되지 않았습니다. 작은 점수 차이보다는 실제로 공감한 문장을 함께 살펴보세요.</p><details><summary>유형 계산법과 채점 근거 보기</summary><p><b>기능 점수:</b> 각 기능은 8문항입니다. 정채점 6문항은 응답값 그대로, 역채점 2문항은 ‘6 − 응답값’으로 바꾼 뒤 평균을 냅니다. 미응답은 임의로 채우지 않습니다.</p><p><b>유형 비교:</b> 16유형의 이론상 주·부기능 조합을 참고합니다. 각 후보의 ‘주기능 점수 × 2 + 부기능 점수’를 비교해 가장 높은 유형을 표시합니다. 이 2:1 가중치는 이 앱에서 정한 규칙이며, 공식 MBTI의 채점법이 아닙니다. 실제로 어떤 기능을 주기능으로 쓰는지 확정하는 결과도 아닙니다.</p><p><b>이번 결과:</b> ${estimate.type}의 비교에 사용한 조합은 ${selectedFormula(estimate,result)}입니다. 화면 반올림값이 아닌 원래 점수로 비교합니다.</p><p><b>동점과 근접 점수:</b> 공동 1위가 있으면 후보 사이에서 다른 부분만 짧게 추가 선택합니다. 이 선택은 64문항 점수를 바꾸지 않습니다. 기능별 평균 대신 합계로 계산한 ‘주기능 합계 × 2 + 부기능 합계’의 차이가 2 이하인 후보는 점수가 비슷하다고 안내합니다. 이는 작은 응답 변화에 주의하기 위한 자체 기준이며, 신뢰구간이나 정확도를 뜻하지 않습니다.</p><div class="reference-links"><a href="https://www.myersbriggs.org/unique-features-of-myers-briggs/type-dynamics-processes/" target="_blank" rel="noopener noreferrer">Myers &amp; Briggs Foundation · 유형과 기능의 관계</a><a href="https://www.testingstandards.net/uploads/7/6/6/4/76643089/9780935302356.pdf" target="_blank" rel="noopener noreferrer">AERA · APA · NCME · 검사 표준</a></div></details></section>
      <div class="results-bottom"><button class="btn btn-secondary" data-action="review">응답 돌아보기</button><button class="btn btn-ghost" data-action="reset">처음부터 다시 하기</button></div><p class="helper">응답은 이 앱의 서버로 전송되지 않습니다. 결과 복사·내려받기는 직접 선택할 때만 실행됩니다.</p></div>`;
  }
  function selectedFormula(estimate,result) {
    const item=estimate.selected;
    return `${item.dominant} (${result.byFunction[item.dominant].displayMean}) × 2 + ${item.auxiliary} (${result.byFunction[item.auxiliary].displayMean})`;
  }
  function render() {
    app.innerHTML=state.screen==='quiz'?quiz():state.screen==='review'?review():state.screen==='tie'?tieStep():state.screen==='results'?results():intro();
    renderHeader();
    document.body.dataset.view=state.screen;
  }
  function choose(value) {
    if(!Number.isInteger(value)||value<1||value>5)return;
    const q=Q.items[state.cursor].q;
    if(state.answers[q]!==value){state.tieAnswers={};state.finishedAt=null;}
    state.answers[q]=value;persist();
    const input=app.querySelector(`input[name="answer"][value="${value}"]`);
    if(input)input.checked=true;
    document.getElementById('selection-note').textContent=value+'점 · '+label(value);
    document.getElementById('clear-answer').hidden=false;
    document.getElementById('next-question').disabled=false;
    document.getElementById('answered-label').textContent=count()+'개 응답 완료';
    const progress=app.querySelector('.progress-track');progress.setAttribute('aria-valuenow',String(count()));progress.firstElementChild.style.width=count()/64*100+'%';
    document.getElementById('storage-label').textContent=storageLabel();renderHeader();
  }
  function finish() {
    if(!E.isComplete(state.answers)){toast('모든 문항에 응답한 뒤 결과를 확인할 수 있습니다.');navigate('review');return;}
    state.wordingReview=false;
    if(!E.estimateType(state.answers,state.tieAnswers).resolved){state.finishedAt=null;navigate('tie');return;}
    state.finishedAt=new Date().toISOString();navigate('results');
  }
  function makeSummary() {
    const result=E.score(state.answers);
    const estimate=E.estimateType(state.answers,state.tieAnswers);
    if(!result.complete||!estimate.resolved)return '';
    return ['MBTI 검사 — 나의 검사 결과',resultDate()+' (한국 시간)',`문항 버전: ${Q.version}`,'',`추정 MBTI: ${estimate.type}`,estimate.selected.description,estimate.tieUsed.length?`동점 후보 중 마지막 선택 ${estimate.tieUsed.length}개를 반영했습니다.`:'8가지 기능 점수로 비교했습니다.','','기능별 점수:',...result.functions.map(x=>`${x.code} ${x.name}: ${x.displayMean} / 5.00`),'','유형 비교 규칙: 각 후보의 이론상 주기능 합계 × 2 + 부기능 합계.',`비교에 쓴 조합: ${estimate.selected.dominant} / ${estimate.selected.auxiliary}`,estimate.tieUsed.length?`마지막 선택: ${estimate.tieUsed.map(x=>x.dimension+'='+x.value).join(', ')}`:'','직접 만든 자기이해용 질문지입니다. 공식 MBTI 검사가 아닙니다.','문항과 유형 계산법의 신뢰도·타당도는 아직 검증되지 않았습니다.','기능 점수는 능력·발달 수준·백분위가 아닙니다.','','문항별 원래 응답:',result.responses.map(x=>`Q${x.q}=${x.response}`).join(', ')].filter(x=>x!==undefined).join('\n');
  }
  async function copyResult() {
    const text=makeSummary();if(!text)return;const submittedAt=state.finishedAt;
    try{await navigator.clipboard.writeText(text);if(state.finishedAt!==submittedAt||!E.isComplete(state.answers))return;toast('결과를 복사했습니다. 채팅에 붙여넣어 볼 수 있어요.');}
    catch(_){if(state.finishedAt!==submittedAt||!E.isComplete(state.answers))return;showModal(`<div class="modal-heading"><h2>결과 복사</h2><button class="btn btn-ghost btn-small" data-action="close">닫기</button></div><p class="helper">아래 내용을 선택해 복사해 주세요.</p><textarea class="copy-area" id="copy-text" readonly aria-label="복사할 결과">${escape(text)}</textarea><div class="modal-actions"><button class="btn btn-primary" data-action="select-copy">내용 선택하기</button></div>`);}
  }
  function downloadResult() {
    const result=E.score(state.answers);if(!result.complete)return;
    const estimate=E.estimateType(state.answers,state.tieAnswers);if(!estimate.resolved)return;
    const payload={title:'MBTI 검사',version:Q.version,completedAt:state.finishedAt,timezone:'Asia/Seoul',note:'자기이해용 자체 제작 질문지. 공식 MBTI 검사 아님. 문항과 유형 계산법의 신뢰도·타당도는 아직 검증되지 않음.',estimatedMBTI:{type:estimate.type,description:estimate.selected.description,method:estimate.method,formula:'2 * dominant adjusted total + auxiliary adjusted total',dominant:estimate.selected.dominant,auxiliary:estimate.selected.auxiliary,initialCandidates:estimate.initialCandidates,tieChoices:estimate.tieUsed,ranking:estimate.ranking.map(x=>({type:x.code,comparisonScore:x.rawScore}))},scores:result.functions.map(x=>({code:x.code,name:x.name,mean:x.mean,displayMean:x.displayMean,adjustedTotal:x.total,count:x.count})),responses:result.responses};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mbti-test-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('결과와 문항별 응답을 JSON 파일로 내려받습니다.');
  }
  document.addEventListener('change',event=>{
    if(event.target.matches('input[name="answer"]')&&state.screen==='quiz')choose(Number(event.target.value));
    if(event.target.id==='filter-missing'){filterMissing=event.target.checked;render();document.getElementById('filter-missing')?.focus();}
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    switch(button.dataset.action){
      case 'home':closeModal();navigate('intro');break;
      case 'start':gotoQuestion(state.cursor+1);break;
      case 'question':gotoQuestion(Number(button.dataset.q));break;
      case 'previous':if(state.cursor>0)gotoQuestion(state.cursor);break;
      case 'next':if(state.answers[state.cursor+1]){if(state.cursor===63)navigate('review');else gotoQuestion(state.cursor+2);}break;
      case 'skip':if(state.cursor===63)navigate('review');else gotoQuestion(state.cursor+2);break;
      case 'clear':delete state.answers[state.cursor+1];state.finishedAt=null;state.tieAnswers={};persist();render();app.querySelector('input[name="answer"]')?.focus();break;
      case 'review':closeModal();filterMissing=false;navigate('review');break;
      case 'missing':{const item=Q.items.find(x=>!state.answers[x.q]);if(item)gotoQuestion(item.q);else navigate('review');break;}
      case 'map':showModal(`<div class="modal-heading"><h2>문항으로 이동</h2><button class="btn btn-ghost btn-small" data-action="close">닫기</button></div><p class="muted">${count()} / 64 응답 완료</p>${questionGrid()}<p class="helper">채워진 칸은 응답 완료입니다. 언제든 돌아가 답을 바꿀 수 있어요.</p><div class="modal-actions"><button class="btn btn-secondary" data-action="review">전체 응답 확인</button></div>`);break;
      case 'close':closeModal();break;
      case 'finish':finish();break;
      case 'tie-choice':{
        if(state.screen!=='tie')break;
        const next=E.estimateType(state.answers,state.tieAnswers).nextTie;
        if(!next||next.dimension!==button.dataset.dimension||!next.options.some(x=>x.value===button.dataset.value))break;
        state.tieAnswers[next.dimension]=button.dataset.value;
        finish();break;
      }
      case 'tie-back':{
        const used=E.estimateType(state.answers,state.tieAnswers).tieUsed;
        if(used.length){delete state.tieAnswers[used[used.length-1].dimension];state.finishedAt=null;navigate('tie');}break;
      }
      case 'redo-tie':state.tieAnswers={};state.finishedAt=null;navigate('tie');break;
      case 'copy':copyResult();break;
      case 'select-copy':{const field=document.getElementById('copy-text');field.focus();field.select();break;}
      case 'download':downloadResult();break;
      case 'reset':showModal('<div class="modal-heading"><h2>처음부터 다시 할까요?</h2></div><p>현재 브라우저의 응답과 결과가 지워집니다. 보관하려면 먼저 결과를 내려받거나 복사해 주세요.</p><div class="modal-actions"><button class="btn btn-secondary" data-action="close">돌아가기</button><button class="btn btn-primary" data-action="confirm-reset">응답 지우고 새로 시작</button></div>');break;
      case 'confirm-reset':closeModal();state=emptyState();filterMissing=false;try{localStorage.removeItem(LEGACY_STORAGE_KEY);}catch(_){storageOK=false;}persist();render();window.scrollTo({top:0,behavior:'instant'});app.querySelector('h1')?.focus({preventScroll:true});toast('새 검사를 시작할 수 있습니다.');break;
    }
  });
  modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();}});
  document.addEventListener('keydown',event=>{
    if(state.screen!=='quiz'||modal.open||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target.matches('textarea,input:not([type="radio"]),[contenteditable="true"]'))return;
    if(/^[1-5]$/.test(event.key)){event.preventDefault();choose(Number(event.key));app.querySelector(`input[name="answer"][value="${event.key}"]`)?.focus();}
    if(event.key==='Enter'&&!event.target.closest('button,a,summary')&&state.answers[state.cursor+1]){event.preventDefault();if(state.cursor===63)navigate('review');else gotoQuestion(state.cursor+2);}
  });
  render();
})();

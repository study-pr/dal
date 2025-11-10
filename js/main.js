document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".nav-btn[data-page]");

  // 🔹 네비게이션 버튼 처리
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const page = btn.getAttribute("data-page");
      if (page) window.location.href = page;
    });
  });

  // 🔹 메인 페이지에서만 후기 & 커미션 데이터 로드
  if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
    loadCommissionData();
    loadReviewData();
    loadPersonal();
    loadSample();
  }
});

// ---------------------------
// 개인작 로드
// ---------------------------
async function loadPersonal() {
  try {
    const res = await fetch('data/personal.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items)) return;

    const container = document.getElementById('personal-list');
    if (!container) return;
    container.innerHTML = '';

    // 최신순 정렬 (date 필드가 있으면 사용, 없으면 그대로)
    const sorted = items.slice().sort((a, b) => {
      if (a.date && b.date) return new Date(b.date) - new Date(a.date);
      return 0;
    });
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
      window._personalItems = sorted;
      window._personalIdx = 0;
      renderPersonalSlider();
    } else {
      // index.html이 아니면 4개씩 그리드로 렌더
      sorted.slice(0, 4).forEach((it, idx) => {
        const el = document.createElement('div');
        el.className = 'thumb';
        el.innerHTML = `<img src="${it.image}" alt="개인작 ${idx+1}" loading="lazy" tabindex="0">`;
        container.appendChild(el);
      });
    }

  } catch (err) {
    console.error('개인작을 불러오는 중 오류:', err);
  }
}

// ---------------------------
// 샘플작 로드
// ---------------------------
async function loadSample() {
  try {
    const res = await fetch('data/sample.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items)) return;

    const container = document.getElementById('sample-list');
    if (!container) return;
    container.innerHTML = '';

    // 최신순 정렬 (date 필드가 있으면 사용, 없으면 그대로)
    const sorted = items.slice().sort((a, b) => {
      if (a.date && b.date) return new Date(b.date) - new Date(a.date);
      return 0;
    });
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
      window._sampleItems = sorted;
      window._sampleIdx = 0;
      renderSampleSlider();
    } else {
      // index.html이 아니면 4개씩 그리드로 렌더 (타입 표시 제거)
      sorted.slice(0, 4).forEach((it, idx) => {
        const el = document.createElement('div');
        el.className = 'thumb';
        el.innerHTML = `<img src="${it.image}" alt="샘플 ${idx+1}" loading="lazy" tabindex="0">`;
        container.appendChild(el);
      });
    }

  } catch (err) {
    console.error('샘플작을 불러오는 중 오류:', err);
  }
}

// --- 슬라이드 렌더 함수 (index.html에서만 사용) ---
function renderPersonalSlider() {
  if (!(window.location.pathname.includes("index.html") || window.location.pathname === "/")) return;
  const container = document.getElementById('personal-list');
  if (!container || !window._personalItems) return;
  container.innerHTML = '';
  const start = window._personalIdx || 0;
  const items = window._personalItems;
  for (let i = start; i < Math.min(start+2, items.length); i++) {
    const it = items[i];
    const el = document.createElement('div');
    el.className = 'thumb';
    el.innerHTML = `<img src="${it.image}" alt="개인작 ${i+1}" loading="lazy" tabindex="0">`;
    container.appendChild(el);
  }
}

function renderSampleSlider() {
  if (!(window.location.pathname.includes("index.html") || window.location.pathname === "/")) return;
  const container = document.getElementById('sample-list');
  if (!container || !window._sampleItems) return;
  container.innerHTML = '';
  const start = window._sampleIdx || 0;
  const items = window._sampleItems;
  for (let i = start; i < Math.min(start+2, items.length); i++) {
    const it = items[i];
    const el = document.createElement('div');
    el.className = 'thumb';
    el.innerHTML = `<img src="${it.image}" alt="샘플 ${i+1}" loading="lazy" tabindex="0">`;
    container.appendChild(el);
  }
}

// --- 슬라이드 버튼 이벤트 ---
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
    const samplePrev = document.getElementById('sample-prev');
    const sampleNext = document.getElementById('sample-next');
    const personalPrev = document.getElementById('personal-prev');
    const personalNext = document.getElementById('personal-next');
    if (samplePrev) samplePrev.addEventListener('click', () => {
      if (window._sampleIdx > 0) { window._sampleIdx -= 1; renderSampleSlider(); }
    });
    if (sampleNext) sampleNext.addEventListener('click', () => {
      if (window._sampleItems && window._sampleIdx < window._sampleItems.length - 2) {
        window._sampleIdx += 1; renderSampleSlider();
      }
    });
    if (personalPrev) personalPrev.addEventListener('click', () => {
      if (window._personalIdx > 0) { window._personalIdx -= 1; renderPersonalSlider(); }
    });
    if (personalNext) personalNext.addEventListener('click', () => {
      if (window._personalItems && window._personalIdx < window._personalItems.length - 2) {
        window._personalIdx += 1; renderPersonalSlider();
      }
    });
  }
});

// 라이트박스 및 후기 모달 핸들러
function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.setAttribute('aria-hidden', 'false');
  const focusable = modalEl.querySelector('[tabindex], button, a, input, textarea');
  if (focusable) focusable.focus();
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.setAttribute('aria-hidden', 'true');
}

// thumbnail click -> lightbox
document.addEventListener('click', (e) => {
  const img = e.target.closest && e.target.closest('.thumb img');
  if (img) {
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCap = document.getElementById('lightbox-caption');
    lbImg.src = img.getAttribute('src');
    lbImg.alt = img.alt || '';

    // 샘플/개인작 구분하여 캡션에 타입/설명 노출
    let caption = '';
    // 샘플 썸네일(메인/샘플)에서 클릭 시 type 정보 노출
    if (img.closest('#sample-list')) {
      // index.html 슬라이드
      let idx = 0;
      if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        idx = window._sampleIdx || 0;
        const items = window._sampleItems || [];
        for (let i = idx; i < Math.min(idx+2, items.length); i++) {
          if (items[i] && items[i].image === img.getAttribute('src')) {
            caption = items[i].type ? `${items[i].type}타입` : '';
            break;
          }
        }
      } else {
        // sample.html
        // data/sample.json에서 src 일치 항목 찾기
        if (window._sampleItems) {
          const found = window._sampleItems.find(it => it.image === img.getAttribute('src'));
          if (found && found.type) caption = `${found.type}타입`;
        }
      }
    }
    lbCap.textContent = caption;
    openModal(lb);
  }
});

// 키보드: ESC로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modals = document.querySelectorAll('.modal[aria-hidden="false"]');
    modals.forEach(m => closeModal(m));
  }
});

// 라이트박스 닫기 버튼
const lbClose = document.getElementById('lightbox-close');
if (lbClose) lbClose.addEventListener('click', () => closeModal(document.getElementById('lightbox')));

// 후기 폼 오픈/닫기
const openReviewBtn = document.getElementById('open-review-form');
if (openReviewBtn) openReviewBtn.addEventListener('click', () => openModal(document.getElementById('review-modal')));
const reviewClose = document.getElementById('review-close');
if (reviewClose) reviewClose.addEventListener('click', () => closeModal(document.getElementById('review-modal')));

// 후기 폼 제출 -> 서버에 POST, 성공 시 리뷰 리스트 갱신
document.addEventListener('submit', async (e) => {
  const form = e.target;
  if (form && form.id === 'review-form') {
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      author: data.get('author') || '익명',
      content: data.get('content') || '',
      date: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('서버 응답 오류');
      // 성공하면 모달 닫고 리뷰 목록 갱신
      closeModal(document.getElementById('review-modal'));
      loadReviewData();
    } catch (err) {
      console.error('리뷰 전송 실패', err);
      const resEl = document.getElementById('review-form-result');
      if (resEl) resEl.textContent = '전송 실패(오프라인일 경우 로컬에 저장됩니다).';
      // fallback local
      try {
        const key = 'local_reviews';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift(payload);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) { console.error('local save failed', e); }
    }
  }
});

// (다크모드 기능 제거됨)

// 간단 focus trap: 모달이 열린 경우 Tab 순환
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const openModalEl = document.querySelector('.modal[aria-hidden="false"]');
    if (!openModalEl) return;
    const focusables = openModalEl.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { last.focus(); e.preventDefault(); }
    } else {
      if (document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }
});

// ---------------------------
// 커미션 폼 처리
// ---------------------------
document.addEventListener('submit', function(e) {
  const form = e.target;
  if (form && form.id === 'commission-form') {
    e.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: data.get('name') || '',
      email: data.get('email') || '',
      type: data.get('type') || 'A',
      message: data.get('message') || '',
      style: data.get('style') || '',
      budget: data.get('budget') || '',
      date: new Date().toISOString()
    };

    // 간단한 클라이언트 검증
    if (!payload.name || !payload.email || !payload.message) {
      const resEl = document.getElementById('commission-result');
      if (resEl) resEl.textContent = '이름, 이메일, 요청 내용은 필수입니다.';
      return;
    }

    // 로컬에 저장 (데모 목적)
    try {
      // 시도: 서버로 전송
      (async () => {
        // 1) Formspree endpoint (for static hosting)
        const formspree = form.getAttribute('data-formspree-endpoint');
        if (formspree) {
          try {
            const body = new URLSearchParams();
            Object.keys(payload).forEach(k => body.append(k, payload[k]));
            const r = await fetch(formspree, { method: 'POST', body });
            if (r.ok) {
              document.getElementById('commission-result').textContent = '신청이 접수되었습니다. 확인 후 연락드리겠습니다.';
              form.reset();
              return;
            }
          } catch (e) { console.warn('Formspree 전송 실패', e); }
        }

        // 2) 서버가 있을 경우 /api/commissions로 전송
        try {
          const r = await fetch('/api/commissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (r.ok) {
            document.getElementById('commission-result').textContent = '신청이 접수되었습니다. 확인 후 연락드리겠습니다.';
            form.reset();
            return;
          }
        } catch (e) { console.warn('/api/commissions 전송 실패', e); }

        // 3) fallback: mailto 링크 생성해서 사용자가 메일앱으로 보낼 수 있게 유도
        try {
          const subject = encodeURIComponent('[커미션 신청] ' + payload.name);
          const body = encodeURIComponent(`이름: ${payload.name}\n이메일: ${payload.email}\n스타일: ${payload.style}\n예산: ${payload.budget}\n\n요청 내용:\n${payload.message}`);
          const mailto = `mailto:?subject=${subject}&body=${body}`;
          // 시도: window.location으로 mailto 호출
          window.location.href = mailto;
        } catch (e) {
          // 마지막 fallback: localStorage
          const key = 'commission_requests';
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.push(payload);
          localStorage.setItem(key, JSON.stringify(existing));
          document.getElementById('commission-result').textContent = '오프라인입니다. 로컬에 저장되었습니다.';
          form.reset();
        }
      })();
    } catch (err) {
      console.error('저장 실패', err);
      const resEl = document.getElementById('commission-result');
      if (resEl) resEl.textContent = '저장 중 오류가 발생했습니다.';
    }
  }
});

// ---------------------------
// 후기 데이터 불러오기
// ---------------------------
async function loadReviewData() {
  try {
    // 1. localStorage에 저장된 최신 후기(방명록) 우선
    let reviews = [];
    try {
      reviews = JSON.parse(localStorage.getItem('local_reviews') || '[]');
    } catch {}
    // 2. 없으면 기존 review.json 불러오기
    if (!reviews || reviews.length === 0) {
      const res = await fetch("data/review.json");
      if (res.ok) {
        reviews = await res.json();
      }
    }
    if (!Array.isArray(reviews)) reviews = [];
    // 최신순 정렬
    reviews = reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 메인페이지: 4개 카드만 노출, 슬라이더 없음
    const reviewSlider = document.getElementById("review-slider");
    const reviewContainer = document.getElementById("review-list");
    if (reviewSlider || reviewContainer) {
      const target = reviewSlider || reviewContainer;
      target.innerHTML = "";
      reviews.slice(0, 4).forEach(r => {
        const div = document.createElement("div");
        div.classList.add("review-item");
        div.innerHTML = `
          <p class=\"review-text\">\"${r.content}\"</p>
          <p class=\"review-author\">- ${r.author} (${r.rating ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+' ' : ''}${r.date ? r.date.split('T')[0] : ''})</p>
        `;
        target.appendChild(div);
      });
    }


  } catch (error) {
    console.error("후기 데이터를 불러오는 중 오류:", error);
  }
}

// ---------------------------
// 커미션 데이터 불러오기
// ---------------------------
async function loadCommissionData() {
  try {
    // 우선 제출된 커미션 데이터가 있으면 사용 (data/commissions.json)
    let commissions = [];
    try {
      const resSub = await fetch('data/commissions.json');
      if (resSub.ok) {
        const arr = await resSub.json();
        if (Array.isArray(arr) && arr.length > 0) commissions = arr;
      }
    } catch (e) { /* ignore */ }

    // 제출 데이터가 없으면 기본 static data/commission.json 사용
    if (commissions.length === 0) {
      const res = await fetch("data/commission.json");
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const arr = await res.json();
      if (!Array.isArray(arr)) throw new Error('commission.json: expected an array');
      commissions = arr;
    }

      // localStorage에 저장된 임시 요청도 병합
      try {
        const local = JSON.parse(localStorage.getItem('commission_requests') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          commissions = local.concat(commissions);
        }
      } catch (e) { /* ignore */ }

    const list = document.getElementById("commission-list");
    const countWorking = document.getElementById("count-working");
    const countWaiting = document.getElementById("count-waiting");
    const countDone = document.getElementById("count-done");

    list.innerHTML = "";

    let working = 0, waiting = 0, done = 0;

    // 제출 데이터는 {name, type, date, ... , status?} 형태일 수 있음
    commissions.forEach(item => {
      const li = document.createElement("li");
      if (item.name) {
        // 이름 마지막 글자만 *로 마스킹
        const name = String(item.name);
        const masked = name.length > 0 ? name.slice(0, -1) + '*' : '*';
        const type = item.type ? `${item.type}타입` : '';
        const status = item.status || item.state || '작업중';
        li.textContent = `${masked} / ${type} / ${status}`;
        if (status.includes('작업')) working++;
        else if (status.includes('대기')) waiting++;
        else if (status.includes('완료')) done++;
      }
      // static 항목은 더 이상 표시하지 않음 (요구사항)
      list.appendChild(li);
    });

    countWorking.textContent = working;
    countWaiting.textContent = waiting;
    countDone.textContent = done;

  } catch (error) {
    console.error("커미션 데이터를 불러오는 중 오류:", error);
  }
}

// 후기 별점 UI 및 방명록식 리스트 렌더
document.addEventListener('DOMContentLoaded', function() {
  // 별점 클릭/키보드
  const starWrap = document.getElementById('star-rating');
  const ratingInput = document.getElementById('rating-value');
  if (starWrap && ratingInput) {
    let current = 5;
    function updateStars(val) {
      Array.from(starWrap.children).forEach((el, i) => {
        el.textContent = (i < val) ? '★' : '☆';
      });
    }
    updateStars(current);
    starWrap.addEventListener('click', e => {
      if (e.target.dataset.value) {
        current = parseInt(e.target.dataset.value);
        ratingInput.value = current;
        updateStars(current);
      }
    });
    starWrap.addEventListener('keydown', e => {
      if (e.key >= '1' && e.key <= '5') {
        current = parseInt(e.key);
        ratingInput.value = current;
        updateStars(current);
      }
    });
  }

  // 후기 리스트 렌더
  function renderReviewListPage() {
    const listEl = document.getElementById('review-list-page');
    if (!listEl) return;
    let reviews = [];
    try {
      reviews = JSON.parse(localStorage.getItem('local_reviews') || '[]');
    } catch {}
    // 최신순
    reviews = reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    listEl.innerHTML = '';
    reviews.forEach(r => {
      const div = document.createElement('div');
      div.className = 'review-item-page';
      div.innerHTML = `<div class="review-meta"><b>${r.author}</b> <span class="review-stars">${'★'.repeat(r.rating||5)}${'☆'.repeat(5-(r.rating||5))}</span></div><div class="review-content">${r.content}</div>`;
      listEl.appendChild(div);
    });
  }

  // 후기 폼 제출
  const form = document.getElementById('review-form-page');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const data = new FormData(form);
      const payload = {
        author: data.get('author') || '익명',
        content: data.get('content') || '',
        rating: parseInt(data.get('rating') || '5'),
        date: new Date().toISOString()
      };
      // localStorage에 저장
      let reviews = [];
      try { reviews = JSON.parse(localStorage.getItem('local_reviews') || '[]'); } catch {}
      reviews.unshift(payload);
      localStorage.setItem('local_reviews', JSON.stringify(reviews));
      form.reset();
      if (starWrap && ratingInput) { ratingInput.value = 5; Array.from(starWrap.children).forEach((el, i) => { el.textContent = (i < 5) ? '★' : '☆'; }); }
      renderReviewListPage();
    });
  }

  renderReviewListPage();
});

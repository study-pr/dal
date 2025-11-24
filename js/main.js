document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".nav-btn[data-page], .nav-index[data-page]");

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
    initVisitorCounter();
    initGlobalSearch();
    initYouTubePlayer();
    initAdminMode();
  }

  // 미니 플레이어는 모든 페이지에서 초기화
  initMiniPlayer();
  // 🚨 [제거] 고정 프로필 삽입 함수 호출 제거: HTML 구조 변경
  // injectFixedProfile(); 

  // 커미션 게시판 페이지 초기화
  if (window.location.pathname.includes("commission.html")) {
    initCommissionBoard();
  }
});

// ---------------------------
// 유틸리티 함수: YouTube URL -> 임베드 URL 변환 (코드 중복 제거)
// ---------------------------
function toEmbedUrl(url, autoplay = true) {
  try {
    const u = new URL(url);
    const params = autoplay ? '?autoplay=1' : '';
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.replace('/','')}${params}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}${params}`;
      if (u.pathname.startsWith('/shorts/')) {
        const sid = u.pathname.split('/shorts/')[1];
        if (sid) return `https://www.youtube.com/embed/${sid}${params}`;
      }
    }
  } catch {}
  return '';
}

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
// 커미션 게시판 (무서버, 로컬 저장)
// ---------------------------
function initCommissionBoard() {
  const form = document.getElementById('commission-board-form');
  const listEl = document.getElementById('commission-board-list');
  const viewModal = document.getElementById('commission-view-modal');
  const viewBody = document.getElementById('commission-view-body');
  const viewClose = document.getElementById('commission-view-close');
  const delBtn = document.getElementById('commission-delete');

  if (!form || !listEl) return;

  function readBoard() {
    try {
      const arr = JSON.parse(localStorage.getItem('commission_board') || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function writeBoard(arr) {
    localStorage.setItem('commission_board', JSON.stringify(arr));
  }
  function maskName(name) {
    const s = String(name || '');
    if (!s) return '*';
    return s.length > 1 ? s.slice(0, -1) + '*' : '*';
  }
  function renderList() {
    const items = readBoard().sort((a,b) => new Date(b.date) - new Date(a.date));
    listEl.innerHTML = '';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'board-item';
      empty.textContent = '아직 접수된 신청이 없습니다.';
      listEl.appendChild(empty);
      return;
    }
    items.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'board-item';
      div.setAttribute('data-idx', String(idx));
      const left = document.createElement('div');
      left.innerHTML = `<div class="title">${maskName(it.name)} / ${it.type || 'A'}</div><div class="meta">${(it.date||'').split('T')[0]}</div>`;
      const right = document.createElement('div');
      right.className = 'meta';
      right.textContent = it.status || '접수';
      div.appendChild(left);
      div.appendChild(right);
      listEl.appendChild(div);
    });
  }

  function requirePinIfNeeded(item, reason) {
    const isAdmin = document.body.classList.contains('is-admin');
    if (isAdmin) return true;
    const pin = prompt(`${reason}을(를) 위해 4자리 비밀번호를 입력하세요`);
    if (!pin) return false;
    return pin === item.pin;
  }

  function openView(idx) {
    const items = readBoard();
    const item = items[idx];
    if (!item) return;
    // 열람: 관리자는 바로, 작성자는 PIN 확인
    if (!requirePinIfNeeded(item, '열람')) return;
    
    // 🚨 [XSS 수정] innerHTML 대신 안전하게 DOM 요소와 textContent 사용
    viewBody.innerHTML = ''; // 기존 내용 삭제

    const fields = [
      { label: '이름', value: item.name },
      { label: '이메일', value: item.email || '-' },
      { label: '타입', value: item.type || 'A' },
      { label: '작성일', value: (item.date||'').replace('T',' ').slice(0,16) },
    ];

    fields.forEach(f => {
      const p = document.createElement('p');
      const b = document.createElement('b');
      b.textContent = f.label;
      p.appendChild(b);
      // 안전하게 Text Node로 삽입
      p.appendChild(document.createTextNode(` ${f.value}`));
      viewBody.appendChild(p);
    });

    // 요청 내용은 별도의 요소에 textContent로 삽입
    const messageP = document.createElement('p');
    messageP.innerHTML = '<b>요청 내용</b><br>';
    const messageContent = document.createElement('span'); // 또는 div
    // 사용자가 입력한 메시지를 textContent로 삽입. 줄바꿈을 \n으로 변환
    messageContent.textContent = (item.message||'').replace(/\\n/g, '\n');
    messageP.appendChild(messageContent);
    viewBody.appendChild(messageP);
    // ----------------------------------------------------

    delBtn.setAttribute('data-idx', String(idx));
    openModal(viewModal);
  }

  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const item = e.target.closest && e.target.closest('.board-item');
      if (!item) return;
      const idx = parseInt(item.getAttribute('data-idx'));
      if (!isNaN(idx)) openView(idx);
    });
  }

  if (viewClose) viewClose.addEventListener('click', () => closeModal(viewModal));

  if (delBtn) {
    delBtn.addEventListener('click', () => {
      const idx = parseInt(delBtn.getAttribute('data-idx'));
      const items = readBoard();
      const item = items[idx];
      if (!item) return;
      if (!document.body.classList.contains('is-admin')) {
        if (!requirePinIfNeeded(item, '삭제')) return;
      }
      if (confirm('이 글을 삭제할까요?')) {
        items.splice(idx, 1);
        writeBoard(items);
        closeModal(viewModal);
        renderList();
      }
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const entry = {
      name: (data.get('name')||'').toString().trim(),
      email: (data.get('email')||'').toString().trim(),
      type: (data.get('type')||'A').toString().trim(),
      message: (data.get('message')||'').toString().trim(),
      pin: (data.get('pin')||'').toString().trim(),
      status: '접수',
      date: new Date().toISOString()
    };
    if (!/^[0-9]{4}$/.test(entry.pin)) {
      alert('비밀번호는 숫자 4자리여야 합니다.');
      return;
    }
    if (!entry.name || !entry.message) {
      alert('이름과 요청 내용은 필수입니다.');
      return;
    }
    const items = readBoard();
    items.unshift(entry);
    writeBoard(items);
    form.reset();
    renderList();
    alert('등록되었습니다. 비밀번호는 잊지 마세요!');
  });

  renderList();
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

// --- 슬라이드 렌더 함수 (index.html에서만 사용) ---
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
    const recentPrev = document.getElementById('recent-prev');
    const recentNext = document.getElementById('recent-next');
    const bestPrev = document.getElementById('best-prev');
    const bestNext = document.getElementById('best-next');
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
    if (recentPrev) recentPrev.addEventListener('click', () => {
      if (window._recentIdx > 0) { window._recentIdx -= 1; renderRecentSlider(); }
    });
    if (recentNext) recentNext.addEventListener('click', () => {
      if (window._recentReviews && window._recentIdx < window._recentReviews.length - 2) {
        window._recentIdx += 1; renderRecentSlider();
      }
    });
    if (bestPrev) bestPrev.addEventListener('click', () => {
      if (window._bestIdx > 0) { window._bestIdx -= 1; renderBestSlider(); }
    });
    if (bestNext) bestNext.addEventListener('click', () => {
      if (window._bestReviews && window._bestIdx < window._bestReviews.length - 2) {
        window._bestIdx += 1; renderBestSlider();
      }
    });
  }
});

// ---------------------------
// 방문자 카운터(로컬) & 표시
// ---------------------------
function initVisitorCounter() {
  try {
    const key = 'visitor_count';
    const n = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(n));
    const badge = document.getElementById('visitor-badge');
    if (badge) badge.textContent = `👀 ${n}`;
  } catch {}
}

// ---------------------------
// 전역 검색 (샘플/개인작 제목)
// ---------------------------
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      // 검색어 없으면 기본 슬라이더 렌더
      renderSampleSlider();
      renderPersonalSlider();
      return;
    }
    // 샘플 필터
    if (window._sampleItems) {
      const container = document.getElementById('sample-list');
      if (container) {
        container.innerHTML = '';
        window._sampleItems.filter(it => (it.title||'').toLowerCase().includes(q)).slice(0, 8).forEach((it, idx) => {
          const el = document.createElement('div');
          el.className = 'thumb';
          el.innerHTML = `<img src="${it.image}" alt="샘플 ${idx+1}" loading="lazy" tabindex="0">`;
          container.appendChild(el);
        });
      }
    }
    // 개인작 필터
    if (window._personalItems) {
      const container = document.getElementById('personal-list');
      if (container) {
        container.innerHTML = '';
        window._personalItems.filter(it => (it.title||'').toLowerCase().includes(q)).slice(0, 8).forEach((it, idx) => {
          const el = document.createElement('div');
          el.className = 'thumb';
          el.innerHTML = `<img src="${it.image}" alt="개인작 ${idx+1}" loading="lazy" tabindex="0">`;
          container.appendChild(el);
        });
      }
    }
  });
}

// ---------------------------
// YouTube 플레이어 (링크 -> 임베드)
// ---------------------------
function initYouTubePlayer() {
  const btn = document.getElementById('youtube-play');
  const input = document.getElementById('youtube-url');
  const iframe = document.getElementById('youtube-iframe');
  if (!btn || !input || !iframe) return;

  // 저장된 음악 임베드가 있으면 바로 표시
  try {
    const saved = localStorage.getItem('music_embed') || '';
    if (saved) {
      iframe.src = saved;
      iframe.style.display = 'block';
    }
  } catch {}
  
  btn.addEventListener('click', () => {
    const embed = toEmbedUrl(input.value); 
    
    if (embed) {
      iframe.src = embed;
      iframe.style.display = 'block';
      try { localStorage.setItem('music_embed', embed); } catch {}
    } else {
      alert('유효한 YouTube 링크가 아닙니다.');
    }
  });
}

// ---------------------------
// 미니 음악 플레이어(고정) + Admin 음악 설정
// ---------------------------
function setMusicEmbed(url) {
  const embed = toEmbedUrl(url); 

  if (embed) {
    try { localStorage.setItem('music_embed', embed); } catch {}
    return embed;
  }
  return '';
}

function initMiniPlayer() {
  const playBtn = document.getElementById('mini-play');
  const pauseBtn = document.getElementById('mini-pause');
  const iframe = document.getElementById('mini-iframe');
  const setBtn = document.getElementById('music-set'); // admin 전용 (index에 있음)

  if (setBtn) {
    setBtn.addEventListener('click', () => {
      if (!document.body.classList.contains('is-admin')) return;
      const url = prompt('YouTube 링크를 입력하세요');
      if (!url) return;
      const embed = setMusicEmbed(url);
      if (embed) {
        try { localStorage.setItem('music_playing', '1'); } catch {}
        if (iframe) { iframe.src = embed; iframe.style.display = 'block'; }
        if (playBtn && pauseBtn) { playBtn.style.display = 'none'; pauseBtn.style.display = 'inline-block'; }
      } else {
        alert('유효한 YouTube 링크가 아닙니다.');
      }
    });
  }

  if (!playBtn || !pauseBtn || !iframe) return;

  // 페이지 진입 시 이전 상태 복원
  try {
    const embed = localStorage.getItem('music_embed') || '';
    const isPlaying = localStorage.getItem('music_playing') === '1';
    if (embed) {
      iframe.src = isPlaying ? embed : embed.replace('?autoplay=1','');
      iframe.style.display = 'block';
      if (isPlaying) { playBtn.style.display = 'none'; pauseBtn.style.display = 'inline-block'; }
    }
  } catch {}

  playBtn.addEventListener('click', () => {
    try {
      const embed = localStorage.getItem('music_embed') || '';
      if (!embed) return;
      // 재시작을 위해 src 재세팅
      iframe.src = embed;
      iframe.style.display = 'block';
      localStorage.setItem('music_playing', '1');
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
    } catch {}
  });
  pauseBtn.addEventListener('click', () => {
    // 간단 pause: src 비우기
    iframe.src = '';
    try { localStorage.setItem('music_playing', '0'); } catch {}
    pauseBtn.style.display = 'none';
    playBtn.style.display = 'inline-block';
  });
}
// ---------------------------
// Admin Mode (static): 패스코드로 body에 is-admin 클래스 토글
// ---------------------------
function initAdminMode() {
  const ADMIN_KEY = 'is_admin';
  const PASS = 'naru-admin'; // 필요 시 변경하세요
  const btn = document.getElementById('admin-toggle');
  if (!btn) return;

  // 초기 상태 반영
  try {
    const enabled = localStorage.getItem(ADMIN_KEY) === '1';
    if (enabled) document.body.classList.add('is-admin');
  } catch {}

  btn.addEventListener('click', () => {
    const enabled = document.body.classList.contains('is-admin');
    if (enabled) {
      document.body.classList.remove('is-admin');
      try { localStorage.setItem(ADMIN_KEY, '0'); } catch {}
      return;
    }
    const input = prompt('관리자 패스코드를 입력하세요');
    if (input && input === PASS) {
      document.body.classList.add('is-admin');
      try { localStorage.setItem(ADMIN_KEY, '1'); } catch {}
    } else if (input) {
      alert('패스코드가 올바르지 않습니다.');
    }
  });
}

// ---------------------------
// 🚨 [제거] 고정 프로필 삽입(비-메인 페이지) 함수 제거
// ---------------------------


// ---------------------------
// 드래그 이동(메인 카드) + 위치 저장
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (!(window.location.pathname.includes("index.html") || window.location.pathname === "/")) return;
  const key = 'drag_positions_index';
  function readPos() {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  }
  function writePos(obj) { localStorage.setItem(key, JSON.stringify(obj)); }
  const positions = readPos();
  // 🚨 [수정] 드래그 방지: 프로필 카드의 드래그 기능을 비활성화 (HTML에서 data-draggable 제거)
  document.querySelectorAll('[data-draggable="true"]').forEach(el => {
    const id = el.id;
    if (positions[id]) {
      el.style.position = 'relative';
      el.style.left = positions[id].x + 'px';
      el.style.top = positions[id].y + 'px';
    }
    let startX = 0, startY = 0, originX = 0, originY = 0, dragging = false;
    function onDown(e) {
      if (el.dataset.locked === 'true') return; // allow disabling drag
      dragging = true;
      const p = ('touches' in e) ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;
      const rect = el.getBoundingClientRect();
      originX = parseInt(el.style.left || '0');
      originY = parseInt(el.style.top || '0');
      el.style.willChange = 'transform';
      e.preventDefault();
    }
    function onMove(e) {
      if (!dragging) return;
      const p = ('touches' in e) ? e.touches[0] : e;
      const dx = p.clientX - startX;
      const dy = p.clientY - startY;
      el.style.left = originX + dx + 'px';
      el.style.top = originY + dy + 'px';
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      el.style.willChange = 'auto';
      positions[id] = { x: parseInt(el.style.left||'0'), y: parseInt(el.style.top||'0') };
      writePos(positions);
    }
    el.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    el.addEventListener('touchstart', onDown, { passive:false });
    document.addEventListener('touchmove', onMove, { passive:false });
    document.addEventListener('touchend', onUp);
  });
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
// 커미션 로컬 관리(추가/수정/삭제/불러오기/내보내기)
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (!(window.location.pathname.includes("index.html") || window.location.pathname === "/")) return;

  const adminBtn = document.getElementById('open-commission-admin');
  const adminModal = document.getElementById('commission-admin-modal');
  const adminClose = document.getElementById('commission-admin-close');
  const adminForm = document.getElementById('commission-admin-form');
  const adminTableBody = document.getElementById('commission-admin-list');
  const exportBtn = document.getElementById('commission-export');
  const importInput = document.getElementById('commission-import');
  const clearBtn = document.getElementById('commission-clear');

  function readAdminList() {
    try {
      const arr = JSON.parse(localStorage.getItem('commission_admin') || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeAdminList(arr) {
    localStorage.setItem('commission_admin', JSON.stringify(arr));
  }
  function renderAdminTable() {
    const items = readAdminList();
    if (!adminTableBody) return;
    adminTableBody.innerHTML = '';
    items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${it.name || ''}</td>
        <td>${it.type || ''}</td>
        <td>
          <select data-idx="${idx}" class="admin-status-select">
            <option value="작업중"${(it.status||'작업중')==='작업중'?' selected':''}>작업중</option>
            <option value="대기중"${it.status==='대기중'?' selected':''}>대기중</option>
            <option value="완료"${it.status==='완료'?' selected':''}>완료</option>
          </select>
        </td>
        <td><button data-del="${idx}">삭제</button></td>
      `;
      adminTableBody.appendChild(tr);
    });
  }

  if (adminBtn) adminBtn.addEventListener('click', () => { openModal(adminModal); renderAdminTable(); });
  if (adminClose) adminClose.addEventListener('click', () => closeModal(adminModal));

  if (adminForm) {
    adminForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(adminForm);
      const item = {
        name: (data.get('name') || '').toString().trim(),
        type: (data.get('type') || 'A').toString().trim(),
        status: (data.get('status') || '작업중').toString().trim(),
        date: new Date().toISOString()
      };
      if (!item.name) return;
      const items = readAdminList();
      items.unshift(item);
      writeAdminList(items);
      adminForm.reset();
      renderAdminTable();
      loadCommissionData();
    });
  }

  if (adminTableBody) {
    adminTableBody.addEventListener('change', e => {
      const sel = e.target;
      if (sel && sel.classList.contains('admin-status-select')) {
        const idx = parseInt(sel.getAttribute('data-idx'));
        const items = readAdminList();
        if (!isNaN(idx) && items[idx]) {
          items[idx].status = sel.value;
          writeAdminList(items);
          loadCommissionData();
        }
      }
    });
    adminTableBody.addEventListener('click', e => {
      const btn = e.target.closest && e.target.closest('button[data-del]');
      if (btn) {
        const idx = parseInt(btn.getAttribute('data-del'));
        const items = readAdminList();
        if (!isNaN(idx)) {
          items.splice(idx, 1);
          writeAdminList(items);
          renderAdminTable();
          loadCommissionData();
        }
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = JSON.stringify(readAdminList(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'commissions.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (Array.isArray(arr)) {
          writeAdminList(arr);
          renderAdminTable();
          loadCommissionData();
        } else {
          alert('JSON 배열 형태가 아닙니다.');
        }
      } catch (e) {
        alert('JSON 파싱에 실패했습니다.');
      } finally {
        importInput.value = '';
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('로컬에 저장된 커미션 관리 데이터를 모두 삭제할까요?')) {
        localStorage.removeItem('commission_admin');
        renderAdminTable();
        loadCommissionData();
      }
    });
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

    // 메인페이지: 최근 후기 슬라이더(2개씩)
    const recentEl = document.getElementById("recent-slider");
    if (recentEl) {
      window._recentReviews = reviews.slice(0, 8);
      window._recentIdx = 0;
      renderRecentSlider();
    }

    // Best 후기 슬라이더 (로컬 관리)
    const bestEl = document.getElementById("best-slider");
    if (bestEl) {
      let best = [];
      try { best = JSON.parse(localStorage.getItem('best_reviews') || '[]'); } catch {}
      if (!Array.isArray(best)) best = [];
      window._bestReviews = best.slice(0, 8);
      window._bestIdx = 0;
      renderBestSlider();
    }


  } catch (error) {
    console.error("후기 데이터를 불러오는 중 오류:", error);
  }
}

// Best 후기 관리 모달
document.addEventListener('DOMContentLoaded', () => {
  if (!(window.location.pathname.includes("index.html") || window.location.pathname === "/")) return;
  const openBtn = document.getElementById('open-best-admin');
  const modal = document.getElementById('best-admin-modal');
  const closeBtn = document.getElementById('best-admin-close');
  const form = document.getElementById('best-form');
  const listBody = document.getElementById('best-admin-list');
  function readBest() {
    try { const arr = JSON.parse(localStorage.getItem('best_reviews') || '[]'); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }
  function writeBest(arr) { localStorage.setItem('best_reviews', JSON.stringify(arr.slice(0, 4))); }
  function renderBestAdmin() {
    if (!listBody) return;
    const arr = readBest();
    listBody.innerHTML = '';
    arr.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${it.author}</td><td>${'★'.repeat(it.rating||5)}</td><td><button data-del="${idx}">삭제</button></td>`;
      listBody.appendChild(tr);
    });
  }
  if (openBtn) openBtn.addEventListener('click', () => { if (document.body.classList.contains('is-admin')) { openModal(modal); renderBestAdmin(); } });
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    if (!document.body.classList.contains('is-admin')) return;
    const data = new FormData(form);
    const item = {
      author: (data.get('author')||'').toString().trim(),
      content: (data.get('content')||'').toString().trim(),
      rating: parseInt((data.get('rating')||'5').toString(), 10) || 5,
      date: new Date().toISOString()
    };
    if (!item.author || !item.content) return;
    const arr = readBest();
    arr.unshift(item);
    writeBest(arr);
    form.reset();
    renderBestAdmin();
    // 슬라이더 갱신
    window._bestReviews = readBest();
    window._bestIdx = 0;
    renderBestSlider();
  });
  if (listBody) listBody.addEventListener('click', e => {
    const btn = e.target.closest && e.target.closest('button[data-del]');
    if (!btn) return;
    const idx = parseInt(btn.getAttribute('data-del'));
    const arr = readBest();
    arr.splice(idx, 1);
    writeBest(arr);
    renderBestAdmin();
    window._bestReviews = readBest();
    window._bestIdx = 0;
    renderBestSlider();
  });
});
function renderRecentSlider() {
  const wrap = document.getElementById('recent-slider');
  if (!wrap || !window._recentReviews) return;
  const start = window._recentIdx || 0;
  const items = window._recentReviews;
  wrap.innerHTML = '';
  for (let i = start; i < Math.min(start+2, items.length); i++) {
    const r = items[i];
    const div = document.createElement('div');
    div.classList.add('review-item');
    
    // 🚨 [XSS 수정] innerHTML 대신 안전하게 DOM 요소와 textContent 사용
    const textP = document.createElement('p');
    textP.classList.add('review-text');
    textP.textContent = `"${r.content}"`; 

    const authorP = document.createElement('p');
    authorP.classList.add('review-author');
    authorP.textContent = `- ${r.author} (${r.rating ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+' ' : ''}${r.date ? r.date.split('T')[0] : ''})`;

    div.appendChild(textP);
    div.appendChild(authorP);
    // ----------------------------------------------------
    wrap.appendChild(div);
  }
}

function renderBestSlider() {
  const wrap = document.getElementById('best-slider');
  if (!wrap || !window._bestReviews) return;
  const start = window._bestIdx || 0;
  const items = window._bestReviews;
  wrap.innerHTML = '';
  for (let i = start; i < Math.min(start+2, items.length); i++) {
    const r = items[i];
    const div = document.createElement('div');
    div.classList.add('review-item');
    
    // 🚨 [XSS 수정] innerHTML 대신 안전하게 DOM 요소와 textContent 사용
    const textP = document.createElement('p');
    textP.classList.add('review-text');
    textP.textContent = `"${r.content}"`;

    const authorP = document.createElement('p');
    authorP.classList.add('review-author');
    authorP.textContent = `- ${r.author} (${r.rating ? '★'.repeat(r.rating)+'☆'.repeat(5-r.rating)+' ' : ''})`;

    div.appendChild(textP);
    div.appendChild(authorP);
    // ----------------------------------------------------
    wrap.appendChild(div);
  }
}

// ---------------------------
// 커미션 데이터 불러오기
// ---------------------------
async function loadCommissionData() {
  try {
    // 0) 관리자가 로컬에서 설정한 커미션(admin) 우선 적용
    let adminList = [];
    try {
      adminList = JSON.parse(localStorage.getItem('commission_admin') || '[]');
      if (!Array.isArray(adminList)) adminList = [];
    } catch (e) { adminList = []; }

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

    // 관리자 리스트가 있으면 이를 최우선으로 사용(사용자 업데이트 편의)
    if (adminList.length > 0) {
      commissions = adminList.concat(commissions);
    }

    const list = document.getElementById("commission-list");
    const countWorking = document.getElementById("count-working");
    const countWaiting = document.getElementById("count-waiting");
    const countDone = document.getElementById("count-done");

    list.innerHTML = "";

    let working = 0, waiting = 0, done = 0;

    // 제출 데이터는 {name, type, date, ... , status?} 형태일 수 있음
    commissions.forEach(item => {
      // static 기본 데이터(이름 없음)는 표시하지 않음
      if (!item || !item.name) return;
      const li = document.createElement("li");
      // 이름 마지막 글자만 *로 마스킹
      const name = String(item.name);
      const masked = name.length > 0 ? name.slice(0, -1) + '*' : '*';
      const type = item.type ? `${item.type}타입` : '';
      const status = item.status || item.state || '작업중';

      let badgeClass = 'status-working';
      if (status.includes('대기')) badgeClass = 'status-waiting';
      else if (status.includes('완료')) badgeClass = 'status-done';

      li.innerHTML = `<span class="commission-item-name">${masked}</span> <span class="commission-item-type">${type}</span> <span class="status-badge ${badgeClass}">${status}</span>`;

      if (status.includes('작업')) working++;
      else if (status.includes('대기')) waiting++;
      else if (status.includes('완료')) done++;
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
      // 🚨 [XSS 수정] innerHTML 대신 안전하게 DOM 요소와 textContent 사용
      const rating = r.rating||5;
      const stars = '★'.repeat(rating) + '☆'.repeat(5-rating);
      
      const meta = document.createElement('div');
      meta.className = 'review-meta';
      meta.innerHTML = `<b>${r.author}</b> <span class=\"review-stars\">${stars}</span>`;

      const content = document.createElement('div');
      content.className = 'review-content';
      content.textContent = r.content; // 안전한 텍스트 삽입

      div.appendChild(meta);
      div.appendChild(content);
      // ----------------------------------------------------
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
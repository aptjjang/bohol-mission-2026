// ===== 앱 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

let deferredInstallPrompt = null;
let installPending = false;

// 서비스워커를 최대한 빨리 등록
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // 사용자가 이미 버튼을 눌러서 대기 중이면 바로 설치 실행
  if (installPending) {
    installPending = false;
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') deferredInstallPrompt = null;
      const btn = document.getElementById('btn-install-app');
      if (btn) btn.querySelector('.menu-label').textContent = '앱다운로드';
    });
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  installPending = false;
  const btn = document.getElementById('btn-install-app');
  if (btn) btn.querySelector('.menu-label').textContent = '설치완료!';
});

const App = {
  currentPage: 'home',

  init() {
    this.showSplash();
    this.setupNavigation();
    this.setupMoreMenu();
    this.setupInstallButton();
    this.setupBackButton();
    this.renderHome();
    this.renderInfo();
    this.renderTeam();
    this.renderSchedule();
    this.renderChecklist();
    this.renderPrayer();
    this.renderSongs();
    this.renderLanguage();
    this.renderGospel();
    this.renderEvaluation();
    this.registerSW();
  },

  // ===== 앱 설치 버튼 =====
  setupInstallButton() {
    const btn = document.getElementById('btn-install-app');
    if (!btn) return;

    // 이미 홈화면에서 실행 중이면 버튼 숨김
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      btn.querySelector('.menu-label').textContent = '설치완료!';
      btn.style.opacity = '0.5';
      return;
    }

    btn.addEventListener('click', async () => {
      // Android/Chrome: PWA 설치 프롬프트
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const result = await deferredInstallPrompt.userChoice;
        if (result.outcome === 'accepted') deferredInstallPrompt = null;
        return;
      }

      // iOS 감지: Safari "홈 화면에 추가" 안내
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        this.showIOSInstallGuide();
        return;
      }

      // 그 외: 대기 등록
      installPending = true;
      btn.querySelector('.menu-label').textContent = '설치 준비중...';
      setTimeout(() => {
        if (installPending && !deferredInstallPrompt) {
          installPending = false;
          btn.querySelector('.menu-label').textContent = '앱다운로드';
        }
      }, 10000);
    });
  },

  // ===== iOS 앱 설치 안내 =====
  showIOSInstallGuide() {
    const existing = document.getElementById('ios-install-guide');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ios-install-guide';
    overlay.className = 'ios-install-overlay';
    overlay.innerHTML = `
      <div class="ios-install-content">
        <h3>iPhone에 앱 설치하기</h3>
        <div class="ios-install-steps">
          <div class="ios-step">
            <span class="ios-step-num">1</span>
            <span>하단의 <strong>공유 버튼</strong>을 누르세요</span>
            <span class="ios-share-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#007AFF" stroke-width="1.8">
                <path d="M10 2v11M6 6l4-4 4 4M4 11v5a2 2 0 002 2h8a2 2 0 002-2v-5"/>
              </svg>
            </span>
          </div>
          <div class="ios-step">
            <span class="ios-step-num">2</span>
            <span><strong>홈 화면에 추가</strong>를 선택하세요</span>
            <span class="ios-add-icon">+</span>
          </div>
          <div class="ios-step">
            <span class="ios-step-num">3</span>
            <span>오른쪽 상단 <strong>추가</strong>를 누르면 완료!</span>
          </div>
        </div>
        <button class="btn-primary ios-install-close">확인</button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('.ios-install-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  },

  // ===== 뒤로가기 (Android 하드웨어/제스처) =====
  setupBackButton() {
    // 초기 홈 상태 등록
    history.replaceState({ page: 'home' }, '', '');

    window.addEventListener('popstate', (e) => {
      // 앨범 뷰어 열려있으면 먼저 닫기
      const albumViewer = document.getElementById('album-viewer');
      if (albumViewer && !albumViewer.classList.contains('hidden')) {
        if (this._albumViewerCleanup) this._albumViewerCleanup();
        history.pushState({ page: this.currentPage }, '', '');
        return;
      }

      // PPT 슬라이드쇼 열려있으면 먼저 닫기
      const viewer = document.getElementById('ppt-viewer');
      if (viewer && !viewer.classList.contains('hidden')) {
        viewer.classList.add('hidden');
        history.pushState({ page: this.currentPage }, '', '');
        return;
      }

      // 더보기 메뉴 열려있으면 닫기
      const moreMenu = document.getElementById('more-menu');
      if (moreMenu && !moreMenu.classList.contains('hidden')) {
        moreMenu.classList.add('hidden');
        history.pushState({ page: this.currentPage }, '', '');
        return;
      }

      // 홈이 아니면 홈으로 이동
      if (this.currentPage !== 'home') {
        this.navigateTo('home', '보홀 단기선교', true);
        history.pushState({ page: 'home' }, '', '');
        return;
      }

      // 홈에서 뒤로가기 → 앱 종료 방지 (한번 더 누르면 종료)
      history.pushState({ page: 'home' }, '', '');
    });
  },

  // ===== 스플래시 화면 =====
  showSplash() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // 2.5초 후 페이드 아웃
    setTimeout(() => {
      splash.classList.add('fade-out');
      // 애니메이션 끝나면 DOM에서 제거
      setTimeout(() => splash.remove(), 600);
    }, 2500);

    // 터치하면 바로 넘기기
    splash.addEventListener('click', () => {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 600);
    });
  },

  // ===== 네비게이션 =====
  setupNavigation() {
    const pages = {
      home: '보홀 단기선교',
      info: '선교안내',
      team: '팀원정보',
      schedule: '일정표',
      checklist: '체크리스트',
      prayer: '기도제목',
      songs: '찬양',
      language: '현지어 가이드',
      gospel: '복음전도',
      eval: '선교평가서'
    };

    // 하단 네비게이션
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page === 'more') {
          document.getElementById('more-menu').classList.remove('hidden');
          return;
        }
        this.navigateTo(page, pages[page]);
      });
    });

    // 홈 메뉴 그리드
    document.querySelectorAll('.menu-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.navigateTo(page, pages[page]);
      });
    });

    // 더보기 메뉴 아이템
    document.querySelectorAll('.more-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.getElementById('more-menu').classList.add('hidden');
        this.navigateTo(page, pages[page]);
      });
    });

    // 뒤로가기 버튼
    document.getElementById('btn-back').addEventListener('click', () => {
      this.navigateTo('home', pages.home);
    });

    // 탭 네비게이션 (이벤트 위임)
    document.querySelectorAll('.tab-nav').forEach(nav => {
      nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const tabId = btn.dataset.tab;
        const parent = nav.parentElement;

        nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        parent.querySelector('#' + tabId).classList.add('active');
      });
    });
  },

  navigateTo(page, title, fromPopState) {
    this.currentPage = page;

    // 페이지 전환
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');

    // 헤더 업데이트
    document.getElementById('header-title').textContent = title || '';
    const backBtn = document.getElementById('btn-back');
    if (page === 'home') {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }

    // 하단 네비 활성화
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // 히스토리 추가 (popstate에서 호출된 게 아닐 때만)
    if (!fromPopState) {
      history.pushState({ page: page }, '', '');
    }

    // 스크롤 위로
    window.scrollTo(0, 0);
  },

  setupMoreMenu() {
    const menu = document.getElementById('more-menu');
    menu.querySelector('.more-menu-overlay').addEventListener('click', () => {
      menu.classList.add('hidden');
    });
  },

  // ===== 홈 화면 =====
  renderHome() {
    this.updateCountdown();
    setInterval(() => this.updateCountdown(), 60000);
    this.setupHeroSlideshow();
  },

  // ===== 전체화면 PPT 슬라이드쇼 =====
  setupHeroSlideshow() {
    const hero = document.getElementById('home-hero-slide');
    const viewer = document.getElementById('ppt-viewer');
    const img = document.getElementById('ppt-image');
    const counter = document.getElementById('ppt-counter');
    if (!hero || !viewer) return;

    const totalSlides = 8;
    let currentSlide = 0;

    hero.style.cursor = 'pointer';
    hero.addEventListener('click', () => {
      currentSlide = 1;
      img.src = 'images/ppt/slide_1.png';
      counter.textContent = '1 / ' + totalSlides;
      viewer.classList.remove('hidden');
    });

    viewer.addEventListener('click', () => {
      currentSlide++;
      if (currentSlide > totalSlides) {
        currentSlide = 0;
        viewer.classList.add('hidden');
        return;
      }
      img.src = 'images/ppt/slide_' + currentSlide + '.png';
      counter.textContent = currentSlide + ' / ' + totalSlides;
    });
  },

  updateCountdown() {
    const el = document.getElementById('home-countdown');
    const start = new Date('2026-02-15T00:00:00+09:00');
    const end = new Date('2026-02-21T23:59:59+09:00');
    const now = new Date();

    if (now < start) {
      const diff = start - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      el.textContent = 'D-' + days + ' 출발까지';
    } else if (now >= start && now <= end) {
      const dayNum = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
      el.textContent = '선교 ' + dayNum + '일차 진행 중!';
    } else {
      el.textContent = '선교 완료! 하나님께 영광';
    }
  },

  // ===== 선교안내 =====
  renderInfo() {
    document.getElementById('purpose-text').textContent = MissionData.purpose.mainPurpose;

    const goalsList = document.getElementById('goals-list');
    goalsList.innerHTML = MissionData.purpose.goals.map((g, i) =>
      `<div class="goal-item"><h4>${i + 1}. ${g.title}</h4><p>${g.desc}</p></div>`
    ).join('');

    this.renderRuleList('rules-arrival', MissionData.rules.arrival);
    this.renderRuleList('rules-ministry', MissionData.rules.ministry);
    this.renderRuleList('rules-life', MissionData.rules.life);

    this.renderRuleList('caution-airport', MissionData.cautions.airport);
    this.renderRuleList('caution-activity', MissionData.cautions.activity);
    this.renderRuleList('caution-general', MissionData.cautions.general);
    this.renderRuleList('caution-food', MissionData.cautions.food);
    this.renderRuleList('caution-team', MissionData.cautions.team);

    document.getElementById('bohol-text').textContent = MissionData.aboutBohol;

    const contactList = document.getElementById('contact-list');
    contactList.innerHTML = MissionData.contacts.map(c =>
      `<div class="card">
        <h3 class="card-title">${c.name}</h3>
        <p class="card-body">
          <strong>${c.person}</strong><br>
          Tel: <a href="tel:${c.phone}" style="color:var(--primary)">${c.phone}</a><br>
          ${c.address}
        </p>
      </div>`
    ).join('');
  },

  renderRuleList(id, items) {
    document.getElementById(id).innerHTML = items.map(item =>
      `<li>${item}</li>`
    ).join('');
  },

  // ===== 팀원 정보 =====
  renderTeam() {
    this.renderMemberCards('all');

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderMemberCards(btn.dataset.filter);
      });
    });

    // 조직도 (시각적 차트)
    const orgList = document.getElementById('org-list');
    const roles = MissionData.organization.roles;
    const topRole = roles[0]; // 총괄
    const subRoles = roles.slice(1);
    orgList.innerHTML = `
      <div class="org-chart">
        <div class="org-chart-top">
          <div class="org-chart-node org-chart-head">
            <div class="org-chart-role">${topRole.role}</div>
            <div class="org-chart-name">${topRole.leader}</div>
          </div>
        </div>
        <div class="org-chart-line-v"></div>
        <div class="org-chart-line-h"></div>
        <div class="org-chart-grid">
          ${subRoles.map(r => `
            <div class="org-chart-node">
              <div class="org-chart-role">${r.role}</div>
              <div class="org-chart-name">${r.leader}</div>
              ${r.members ? '<div class="org-chart-members">' + r.members.join(', ') + '</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>`;

    // 팀사역 (이미지 아이콘 포함)
    const ministryTeams = document.getElementById('ministry-teams');
    const teamIcons = {
      '격파(딱지/마술)': '🥋',
      '줄넘기': '🤸',
      '포토존': '📸',
      '버블(풍선)': '🎈',
      '스티커(네일/타투)': '🎨',
      '달고나': '🍬',
      '촬영팀': '📹'
    };
    ministryTeams.innerHTML = MissionData.organization.teams.map(t =>
      `<div class="org-card ministry-card">
        <div class="ministry-card-inner">
          <div class="ministry-card-text">
            <span class="org-role">${t.name}</span>
            <div class="org-members">
              ${t.leader ? '<span class="org-leader">' + t.leader + '</span> / ' : ''}${t.members.join(', ')}
            </div>
          </div>
          <div class="ministry-card-icon">${teamIcons[t.name] || '⭐'}</div>
        </div>
      </div>`
    ).join('');

    // 숙소 (호텔 주소 포함)
    const roomList = document.getElementById('room-list');
    roomList.innerHTML = MissionData.organization.rooms.map(r =>
      `<div class="org-card">
        <span class="org-role">${r.place}</span>
        ${r.address ? '<span class="room-address">' + r.address + '</span>' : ''}
        <div class="org-members">
          ${r.leader ? '<span class="org-leader">' + r.leader + ' (담당)</span> / ' : ''}${r.members.join(', ')}
        </div>
      </div>`
    ).join('');
  },

  renderMemberCards(filter) {
    const container = document.getElementById('member-cards');
    const members = filter === 'all'
      ? MissionData.members
      : MissionData.members.filter(m => m.gender === filter);

    container.innerHTML = members.map(m => {
      const age = 2026 - m.birth;
      const initial = m.name.charAt(0);
      return `<div class="member-card" data-no="${m.no}">
        <div class="member-avatar ${m.gender === 'M' ? 'male' : 'female'}">${initial}</div>
        <div class="member-info">
          <div class="member-name">${m.name} <small style="color:var(--text-light)">${m.engName}</small></div>
          <div class="member-detail">${m.nameEng} · ${age}세</div>
        </div>
        <span class="member-talent">${m.talent}</span>
      </div>
      <div class="member-expanded" data-expand="${m.no}">
        <strong>이름:</strong> ${m.name} (${m.engName})<br>
        <strong>영문:</strong> ${m.nameEng}<br>
        <strong>출생:</strong> ${m.birth}년 (${age}세)<br>
        <strong>달란트:</strong> ${m.talent}
      </div>`;
    }).join('');

    container.querySelectorAll('.member-card').forEach(card => {
      card.addEventListener('click', () => {
        const no = card.dataset.no;
        const expand = container.querySelector(`.member-expanded[data-expand="${no}"]`);
        expand.classList.toggle('show');
      });
    });
  },

  // ===== 일정표 (한눈에 보기 + 일지 통합) =====
  renderSchedule() {
    this.renderScheduleContent('overview');

    document.querySelectorAll('.schedule-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.schedule-day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderScheduleContent(btn.dataset.day);
      });
    });
  },

  renderScheduleContent(dayFilter) {
    const container = document.getElementById('schedule-content');

    // 한눈에 보기 (오버뷰 테이블)
    if (dayFilter === 'overview') {
      const overviewData = [
        { day: '15(주)', am: '주일예배\n선교사 파송식', pm: '버스 출발(14시)\n부산 이동', eve: '부산공항\n출국(21:30)' },
        { day: '16(월)', am: '세부 도착(1am)\n숙소(9번가빌라)\n항구이동·여객선', pm: '보홀 도착(13시)\n장보기·짐정리', eve: '헤너노캄\n마을회관 사역' },
        { day: '17(화)', am: '따나완\n학교사역', pm: '따나완 지교회\n가정심방(13가정)', eve: '투비곤 공원사역\nK-Food 식사' },
        { day: '18(수)', am: '일리안소울\n학교사역', pm: '일리안소울\n지교회(6가정)', eve: '주민초청\n전도집회' },
        { day: '19(목)', am: '리더와 함께\nM.T(칼라페)', pm: '현지 체험\nBBQ', eve: 'Korean Food\nContest' },
        { day: '20(금)', am: '짐정리\n여객선 탑승', pm: '세부 도착\nMall 쇼핑', eve: '저녁식사(바닷가)\n공항 체크인' },
        { day: '21(토)', am: '세부 출발(2am)\n부산 도착(7:20)', pm: '버스 탑승\n청주 도착(12시)', eve: '' }
      ];

      container.innerHTML = `
        <div style="overflow-x:auto;margin-top:4px">
          <table class="overview-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>오전</th>
                <th>오후</th>
                <th>저녁</th>
              </tr>
            </thead>
            <tbody>
              ${overviewData.map(d => `
                <tr>
                  <td class="ov-day">${d.day}</td>
                  <td class="ov-am">${d.am.replace(/\n/g, '<br>')}</td>
                  <td class="ov-pm">${d.pm.replace(/\n/g, '<br>')}</td>
                  <td class="ov-eve">${d.eve.replace(/\n/g, '<br>')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="checklist-note" style="margin-top:12px">
          <p><strong>출국:</strong> 2/15(주) 21:30 부산 → 세부 (제주항공 7C2167)</p>
          <p><strong>입국:</strong> 2/21(토) 02:00 세부 → 07:20 부산 (제주항공 7C2168)</p>
        </div>
      `;
      return;
    }

    // 특정 일차 상세 보기 + 선교일지
    const dayNum = parseInt(dayFilter);
    const schedule = MissionData.schedule.find(s => s.day === dayNum);
    if (!schedule) {
      container.innerHTML = '<p class="section-desc" style="text-align:center;padding:20px">해당 일차 정보가 없습니다.</p>';
      return;
    }

    const now = new Date();
    const start = new Date('2026-02-15');
    const currentDay = now >= start ? Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1 : -1;
    const isToday = schedule.day === currentDay;

    // 앨범 데이터 확인
    const albumPhotos = (typeof AlbumData !== 'undefined' && AlbumData[dayNum]) ? AlbumData[dayNum] : [];
    const hasPhotos = albumPhotos.length > 0;

    // 일지 데이터 불러오기
    const journalData = Storage.getJournal(dayNum);

    container.innerHTML = `
      <div class="day-card ${isToday ? 'day-today' : ''}">
        <div class="day-header">
          <div class="day-number">${schedule.day}</div>
          <div class="day-title-wrap">
            <h3>${schedule.title}</h3>
            <span>${schedule.date}</span>
          </div>
          ${hasPhotos ? `<button class="album-btn" id="btn-album-${dayNum}">&#128247; 사진 <span class="album-count">${albumPhotos.length}</span></button>` : ''}
        </div>
        ${schedule.events.map(e =>
          `<div class="event-item">
            <span class="event-time">${e.time}</span>
            <span class="event-desc">${e.desc}</span>
          </div>`
        ).join('')}
      </div>

      ${hasPhotos ? `
      <div class="album-gallery" id="album-gallery-${dayNum}">
        <div class="album-gallery-header">
          <h4>&#128247; ${schedule.day}일차 사진첩</h4>
          <span class="album-gallery-count">${albumPhotos.length}장</span>
        </div>
        <div class="album-grid">
          ${albumPhotos.map((file, idx) => {
            const isVideo = file.endsWith('.mp4');
            const src = `images/albums/day${dayNum}/${file}`;
            return `<div class="album-thumb ${isVideo ? 'album-thumb-video' : ''}" data-day="${dayNum}" data-idx="${idx}">
              ${isVideo
                ? `<video src="${src}" muted preload="metadata"></video><span class="album-play-icon">&#9654;</span>`
                : `<img src="${src}" alt="사진 ${idx + 1}" loading="lazy">`}
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="schedule-journal-section">
        <div class="card">
          <div class="journal-inline-header">
            <h4>&#128221; ${schedule.day}일차 선교일지</h4>
            <select class="weather-select" id="sj-weather-${dayNum}">
              <option value="">날씨</option>
              <option value="sunny" ${journalData.weather === 'sunny' ? 'selected' : ''}>맑음</option>
              <option value="cloudy" ${journalData.weather === 'cloudy' ? 'selected' : ''}>흐림</option>
              <option value="rainy" ${journalData.weather === 'rainy' ? 'selected' : ''}>비</option>
              <option value="hot" ${journalData.weather === 'hot' ? 'selected' : ''}>더움</option>
            </select>
          </div>
          <textarea class="journal-inline-textarea" id="sj-text-${dayNum}"
            placeholder="오늘의 선교 이야기를 기록하세요...&#10;감사한 점, 느낀 점, 기도제목 등을 자유롭게 적어보세요.">${this.escapeHtml(journalData.text || '')}</textarea>
          <div class="journal-inline-actions">
            <span class="save-status" id="sj-status-${dayNum}"></span>
            <button class="btn-primary" id="sj-save-${dayNum}">저장</button>
          </div>
        </div>
      </div>
    `;

    // 저장 이벤트
    const saveBtn = document.getElementById('sj-save-' + dayNum);
    const textArea = document.getElementById('sj-text-' + dayNum);
    const weatherSel = document.getElementById('sj-weather-' + dayNum);
    const statusEl = document.getElementById('sj-status-' + dayNum);

    const saveJournal = () => {
      Storage.saveJournal(dayNum, weatherSel.value, textArea.value);
      statusEl.textContent = '저장됨';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    };

    saveBtn.addEventListener('click', saveJournal);

    // 자동 저장 (3초 후)
    let autoSaveTimer;
    textArea.addEventListener('input', () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveJournal, 3000);
    });
    weatherSel.addEventListener('change', saveJournal);

    // 사진 버튼 → 갤러리로 스크롤
    if (hasPhotos) {
      const albumBtn = document.getElementById('btn-album-' + dayNum);
      const galleryEl = document.getElementById('album-gallery-' + dayNum);
      if (albumBtn && galleryEl) {
        albumBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          galleryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      // 그리드 썸네일 클릭 → 전체화면 뷰어
      container.querySelectorAll('.album-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const day = parseInt(thumb.dataset.day);
          const idx = parseInt(thumb.dataset.idx);
          this.openAlbumViewer(day, idx);
        });
      });
    }
  },

  // ===== 사진첩 전체화면 뷰어 =====
  openAlbumViewer(day, startIdx) {
    const files = AlbumData[day];
    if (!files || !files.length) return;

    const viewer = document.getElementById('album-viewer');
    const img = document.getElementById('album-viewer-image');
    const counter = document.getElementById('album-viewer-counter');
    let currentIdx = startIdx;
    let currentVideo = null;

    const show = (idx) => {
      currentIdx = idx;
      const file = files[idx];
      const src = 'images/albums/day' + day + '/' + file;
      const isVideo = file.endsWith('.mp4');

      // 이전 영상 제거
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.remove();
        currentVideo = null;
      }

      if (isVideo) {
        img.style.display = 'none';
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
        viewer.insertBefore(video, viewer.firstChild);
        currentVideo = video;
      } else {
        img.style.display = '';
        img.src = src;
      }
      counter.textContent = (idx + 1) + ' / ' + files.length;
    };

    show(startIdx);
    viewer.classList.remove('hidden');

    const onPrev = (e) => { e.stopPropagation(); show(currentIdx > 0 ? currentIdx - 1 : files.length - 1); };
    const onNext = (e) => { e.stopPropagation(); show(currentIdx < files.length - 1 ? currentIdx + 1 : 0); };
    const onClose = () => { cleanup(); };
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') onPrev(e);
      else if (e.key === 'ArrowRight') onNext(e);
      else if (e.key === 'Escape') cleanup();
    };

    const prevBtn = document.getElementById('album-viewer-prev');
    const nextBtn = document.getElementById('album-viewer-next');
    const closeBtn = document.getElementById('album-viewer-close');
    const downloadBtn = document.getElementById('album-viewer-download');
    const shareBtn = document.getElementById('album-viewer-share');

    const onDownload = (e) => {
      e.stopPropagation();
      const file = files[currentIdx];
      const src = 'images/albums/day' + day + '/' + file;
      const a = document.createElement('a');
      a.href = src;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    const onShare = async (e) => {
      e.stopPropagation();
      const file = files[currentIdx];
      const src = 'images/albums/day' + day + '/' + file;
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const shareFile = new File([blob], file, { type: blob.type });
        await navigator.share({ files: [shareFile] });
      } catch (err) {
        if (err.name !== 'AbortError') {
          // 공유 미지원 시 다운로드로 대체
          onDownload(e);
        }
      }
    };

    prevBtn.addEventListener('click', onPrev);
    nextBtn.addEventListener('click', onNext);
    closeBtn.addEventListener('click', onClose);
    downloadBtn.addEventListener('click', onDownload);
    shareBtn.addEventListener('click', onShare);
    document.addEventListener('keydown', onKey);

    let touchStartX = 0;
    const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) onNext(e); else onPrev(e);
      }
    };
    viewer.addEventListener('touchstart', onTouchStart);
    viewer.addEventListener('touchend', onTouchEnd);

    const cleanup = () => {
      if (currentVideo) { currentVideo.pause(); currentVideo.remove(); currentVideo = null; }
      img.style.display = '';
      viewer.classList.add('hidden');
      prevBtn.removeEventListener('click', onPrev);
      nextBtn.removeEventListener('click', onNext);
      closeBtn.removeEventListener('click', onClose);
      downloadBtn.removeEventListener('click', onDownload);
      shareBtn.removeEventListener('click', onShare);
      document.removeEventListener('keydown', onKey);
      viewer.removeEventListener('touchstart', onTouchStart);
      viewer.removeEventListener('touchend', onTouchEnd);
    };

    this._albumViewerCleanup = cleanup;
  },

  // ===== 체크리스트 (개인용품만 체크박스 + 나머지는 목록) =====
  renderChecklist() {
    // 개인용품 체크리스트 (기존과 동일)
    const personalCat = {
      key: 'personal',
      items: MissionData.checklist.personal,
      containerId: 'checklist-personal',
      progressId: 'progress-personal'
    };
    this.renderChecklistCategory(personalCat);

    // 준비물 목록 (체크박스 없이 카테고리별 보기)
    const suppliesView = document.getElementById('supplies-view');
    const categories = [
      { icon: '&#128230;', title: '공동물품', items: MissionData.checklist.common },
      { icon: '&#9971;', title: '사역준비물 (선교지보관)', items: MissionData.checklist.ministryStored },
      { icon: '&#127890;', title: '사역준비물 (가져갈 것)', items: MissionData.checklist.ministryBring },
      { icon: '&#127858;', title: '식재료', items: MissionData.checklist.food },
      { icon: '&#128722;', title: '현지구입', items: MissionData.checklist.localBuy }
    ];

    suppliesView.innerHTML = categories.map(cat =>
      `<div class="supplies-category">
        <div class="supplies-category-title">${cat.icon} ${cat.title}</div>
        <div class="supplies-grid">
          ${cat.items.map(item => `<span class="supply-tag">${item}</span>`).join('')}
        </div>
      </div>`
    ).join('');

    suppliesView.querySelectorAll('.supply-tag').forEach(tag => {
      tag.addEventListener('click', () => tag.classList.toggle('tapped'));
    });
  },

  renderChecklistCategory(cat) {
    const container = document.getElementById(cat.containerId);
    const checked = Storage.getChecklist(cat.key);

    container.innerHTML = cat.items.map((item, i) =>
      `<div class="check-item ${checked[i] ? 'checked' : ''}" data-cat="${cat.key}" data-idx="${i}">
        <div class="check-box"></div>
        <span class="check-label">${item}</span>
      </div>`
    ).join('');

    this.updateChecklistProgress(cat.key, cat.items.length, cat.progressId);

    container.querySelectorAll('.check-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = item.dataset.idx;
        Storage.toggleCheck(cat.key, idx);
        item.classList.toggle('checked');
        this.updateChecklistProgress(cat.key, cat.items.length, cat.progressId);
      });
    });
  },

  updateChecklistProgress(category, total, progressId) {
    const { checked } = Storage.getCheckCount(category, total);
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const el = document.getElementById(progressId);
    el.innerHTML = `
      <div class="progress-text">${checked} / ${total} 완료 (${pct}%)</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;
  },

  // ===== 기도제목 =====
  renderPrayer() {
    const prayerList = document.getElementById('prayer-list');
    prayerList.innerHTML = MissionData.prayers.map((p, i) =>
      `<div class="prayer-card">
        <h4><span class="prayer-number">${i + 1}</span>${p.title}</h4>
        <p>${p.content}</p>
      </div>`
    ).join('');

    this.renderPersonalPrayers();
    document.getElementById('btn-save-prayer').addEventListener('click', () => {
      const input = document.getElementById('personal-prayer-input');
      const text = input.value.trim();
      if (!text) return;
      Storage.addPersonalPrayer(text);
      input.value = '';
      this.renderPersonalPrayers();
    });

    this.renderDailyPrayer();
  },

  renderPersonalPrayers() {
    const container = document.getElementById('saved-prayers');
    const prayers = Storage.getPersonalPrayers();
    if (!prayers.length) {
      container.innerHTML = '<p class="section-desc" style="text-align:center;padding:20px">아직 작성한 기도제목이 없습니다.</p>';
      return;
    }
    container.innerHTML = prayers.map((p, i) =>
      `<div class="prayer-card" style="position:relative">
        <p>${this.escapeHtml(p.text)}</p>
        <button class="delete-prayer" data-idx="${i}" style="position:absolute;top:10px;right:12px;background:none;border:none;color:var(--text-light);font-size:18px;cursor:pointer">&times;</button>
      </div>`
    ).join('');

    container.querySelectorAll('.delete-prayer').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Storage.removePersonalPrayer(parseInt(btn.dataset.idx));
        this.renderPersonalPrayers();
      });
    });
  },

  renderDailyPrayer() {
    const container = document.getElementById('daily-prayer-check');
    const days = ['2/15(주)', '2/16(월)', '2/17(화)', '2/18(수)', '2/19(목)', '2/20(금)', '2/21(토)'];
    const data = Storage.getDailyPrayer();

    container.innerHTML = days.map((day, di) =>
      `<div class="daily-check-row">
        <span class="daily-date">${day}</span>
        <div class="daily-checks">
          ${[1,2,3].map(slot => {
            const key = di + '_' + slot;
            const checked = data[key];
            return `<button class="daily-check-btn ${checked ? 'checked' : ''}" data-day="${di}" data-slot="${slot}">${checked ? 'V' : ''}</button>`;
          }).join('')}
        </div>
      </div>`
    ).join('');

    container.querySelectorAll('.daily-check-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = btn.dataset.day;
        const slot = btn.dataset.slot;
        const newData = Storage.toggleDailyPrayer(day, slot);
        const key = day + '_' + slot;
        btn.classList.toggle('checked');
        btn.textContent = newData[key] ? 'V' : '';
      });
    });
  },

  // ===== 찬양 (영어찬양 가사 + 악보 이미지) =====
  renderSongs() {
    // 영어찬양 가사
    const lyricsContainer = document.getElementById('songs-list');
    lyricsContainer.innerHTML = MissionData.songs.map((s, i) =>
      `<div class="song-card" data-song="${i}">
        <div class="song-header">
          <span class="song-title">${s.title}</span>
          <span class="song-toggle">&#9660;</span>
        </div>
        <div class="song-lyrics">${this.escapeHtml(s.lyrics)}</div>
      </div>`
    ).join('');

    // GRACE 은혜 (이미지 악보 카드)
    lyricsContainer.insertAdjacentHTML('beforeend', `
      <div class="song-card" data-song="grace">
        <div class="song-header">
          <span class="song-title">GRACE 은혜</span>
          <span class="song-toggle">&#9660;</span>
        </div>
        <div class="song-lyrics song-lyrics-images">
          <img src="images/songs/grace1.jpg" alt="GRACE 은혜 1" loading="lazy">
          <img src="images/songs/grace2.jpg" alt="GRACE 은혜 2" loading="lazy">
        </div>
      </div>
    `);

    lyricsContainer.querySelectorAll('.song-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('open');
      });
    });

    // 악보 이미지
    const sheetsContainer = document.getElementById('sheets-list');
    const sheets = [
      { title: '선교찬양 1 - 너는 그리스도의 향기라 / 당신은 하나님의 언약 안에', file: 'song_1.png' },
      { title: '선교찬양 2 - 하나님께서 당신을 통해 / 하나님의 부르심', file: 'song_2.png' },
      { title: '선교찬양 3 - 꽃들도 (Hanamo)', file: 'song_3.png' },
      { title: '선교찬양 4 - 멈출 수 없네', file: 'song_4.png' },
      { title: '선교찬양 5 - 마지막 날에', file: 'song_5.png' },
      { title: '선교찬양 6 - 내안에 부어 주소서', file: 'song_6.png' },
      { title: '선교찬양 7 - 주 이름 찬양 (Blessed Be Your Name)', file: 'song_7.png' },
      { title: '선교찬양 8 - 주 여기 운행 하시네 (Way Maker)', file: 'song_8.png' },
      { title: '선교찬양 9 - 주님 다시 오실 때까지', file: 'song_9.png' },
      { title: '선교찬양 10 - 하나님 아버지의 마음', file: 'song_10.png' },
      { title: '선교찬양 11 - 주 발 앞에 나 엎드려 (One Way)', file: 'song_11.png' },
      { title: '선교찬양 12 - 은혜', file: 'song_12.jpg' },
      { title: '선교 주제가 - 주 다스리시네', file: 'song_theme2.png' }
    ];

    sheetsContainer.innerHTML = sheets.map((s, i) =>
      `<div class="sheet-card" data-sheet="${i}">
        <div class="sheet-header">
          <span class="sheet-title">${s.title}</span>
          <span class="sheet-toggle">&#9660;</span>
        </div>
        <div class="sheet-image-wrap">
          <img src="images/songs/${s.file}" alt="${s.title}" loading="lazy">
        </div>
      </div>`
    ).join('');

    sheetsContainer.querySelectorAll('.sheet-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('open');
      });
    });
  },

  // ===== 현지어 =====
  renderLanguage() {
    const container = document.getElementById('language-table');
    container.innerHTML = MissionData.language.map((l, i) =>
      `<div class="lang-row" data-audio-idx="${i}">
        <div class="lang-ko">${l.ko}</div>
        <div class="lang-local">
          <div class="lang-cebuano">${l.local}</div>
          <div class="lang-pron">${l.pron}</div>
        </div>
        <button class="tts-btn lang-tts-btn" aria-label="발음 듣기">&#128266;</button>
      </div>`
    ).join('');

    // 실제 세부아노어 녹음 파일 재생
    container.querySelectorAll('.lang-row').forEach(row => {
      const idx = parseInt(row.dataset.audioIdx);
      const btn = row.querySelector('.lang-tts-btn');
      const play = () => this.playCebuanoClip(idx, btn);
      btn.addEventListener('click', (e) => { e.stopPropagation(); play(); });
      row.addEventListener('click', play);
    });

    // 번역 기능
    this.renderTranslateHistory();
    const translateBtn = document.getElementById('btn-translate');
    const translateInput = document.getElementById('translate-input');

    translateBtn.addEventListener('click', () => this.translateToCebuano());
    translateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.translateToCebuano();
    });
  },

  async translateToCebuano() {
    const input = document.getElementById('translate-input');
    const resultEl = document.getElementById('translate-result');
    const text = input.value.trim();
    if (!text) return;

    // 한국어 감지 (한글 유니코드 범위)
    const isKorean = /[가-힣]/.test(text);
    const srcLang = isKorean ? 'ko' : 'en';

    resultEl.classList.remove('hidden');
    resultEl.innerHTML = '<div class="translate-loading">번역 중...</div>';

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcLang}|ceb`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.responseStatus === 200 && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        resultEl.innerHTML = `
          <div class="translate-card">
            <div class="translate-original">${this.escapeHtml(text)}</div>
            <div class="translate-arrow">&#8595;</div>
            <div class="translate-cebuano">${this.escapeHtml(translated)}</div>
            <div class="translate-actions">
              <button class="tts-btn tts-btn-lg" id="btn-tts-translated" aria-label="발음 듣기">&#128266;</button>
              <button class="btn-primary btn-save-translate" id="btn-save-translate">저장</button>
            </div>
          </div>`;

        // ElevenLabs TTS 발음 듣기
        document.getElementById('btn-tts-translated').addEventListener('click', () => {
          this.speakCebuanoEL(translated, document.getElementById('btn-tts-translated'));
        });

        // 저장
        document.getElementById('btn-save-translate').addEventListener('click', () => {
          Storage.addSavedWord(JSON.stringify({ src: text, ceb: translated }));
          this.renderTranslateHistory();
          document.getElementById('btn-save-translate').textContent = '저장됨';
          document.getElementById('btn-save-translate').disabled = true;
        });

        input.value = '';
      } else {
        resultEl.innerHTML = '<div class="translate-loading">번역에 실패했습니다. 다시 시도해 주세요.</div>';
      }
    } catch (e) {
      resultEl.innerHTML = '<div class="translate-loading">인터넷 연결을 확인해 주세요.</div>';
    }
  },

  // ElevenLabs TTS로 세부아노어 발음 생성 (번역 결과용)
  async speakCebuanoEL(text, btn) {
    if (btn) btn.classList.add('speaking');
    const done = () => { if (btn) btn.classList.remove('speaking'); };
    try {
      const res = await fetch('https://bohol-mission-2026.netlify.app/.netlify/functions/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = 0.9;
      audio.onended = () => { done(); URL.revokeObjectURL(url); };
      audio.onerror = done;
      audio.play().catch(done);
    } catch (e) {
      done();
    }
  },

  // 세부아노어 녹음 클립 재생 (인덱스 0~10)
  playCebuanoClip(idx, btn) {
    if (btn) btn.classList.add('speaking');
    const done = () => { if (btn) btn.classList.remove('speaking'); };
    const num = String(idx + 1).padStart(2, '0');
    const audio = new Audio('audio/ceb_' + num + '.mp3');
    audio.playbackRate = 0.9;
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  },

  renderTranslateHistory() {
    const container = document.getElementById('translate-history');
    const words = Storage.getSavedWords();
    if (!words.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = '<div class="translate-history-title">저장된 번역</div>' +
      words.map((w, i) => {
        let src = '', ceb = '';
        try {
          const parsed = JSON.parse(w.text);
          src = parsed.src;
          ceb = parsed.ceb;
        } catch (e) {
          src = w.text;
          ceb = '';
        }
        return `<div class="translate-history-row" data-idx="${i}">
          <div class="translate-history-text">
            <span class="th-src">${this.escapeHtml(src)}</span>
            ${ceb ? '<span class="th-arrow">→</span><span class="th-ceb">' + this.escapeHtml(ceb) + '</span>' : ''}
          </div>
          <div class="translate-history-btns">
            ${ceb ? '<button class="tts-btn th-tts" data-ceb="' + this.escapeAttr(ceb) + '" aria-label="발음">&#128266;</button>' : ''}
            <button class="th-delete" data-idx="${i}">&times;</button>
          </div>
        </div>`;
      }).join('');

    // ElevenLabs TTS 이벤트
    container.querySelectorAll('.th-tts').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.speakCebuanoEL(btn.dataset.ceb, btn);
      });
    });

    // 삭제 이벤트
    container.querySelectorAll('.th-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Storage.removeSavedWord(parseInt(btn.dataset.idx));
        this.renderTranslateHistory();
      });
    });
  },

  // ===== 복음전도 (단계별 + TTS) =====
  renderGospel() {
    const stepsContainer = document.getElementById('gospel-steps');
    stepsContainer.innerHTML = MissionData.gospel.stages.map(stage =>
      `<div class="gospel-stage">
        <div class="gospel-stage-title">${stage.name}</div>
        ${stage.steps.map(s =>
          `<div class="gospel-step" data-tts="${this.escapeAttr(s.eng)}">
            <span class="step-number">${s.day}</span>
            <div class="step-content">
              <div class="step-eng">${this.escapeHtml(s.eng)}</div>
              <div class="step-ko">${this.escapeHtml(s.ko)}</div>
            </div>
            <button class="tts-btn" aria-label="발음 듣기">&#128266;</button>
          </div>`
        ).join('')}
      </div>`
    ).join('');

    // TTS 이벤트
    stepsContainer.querySelectorAll('.gospel-step').forEach(step => {
      const ttsBtn = step.querySelector('.tts-btn');
      const text = step.dataset.tts;
      const speakFn = () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.85;
          utterance.pitch = 1.0;
          ttsBtn.classList.add('speaking');
          utterance.onend = () => ttsBtn.classList.remove('speaking');
          utterance.onerror = () => ttsBtn.classList.remove('speaking');
          window.speechSynthesis.speak(utterance);
        }
      };
      ttsBtn.addEventListener('click', (e) => { e.stopPropagation(); speakFn(); });
      step.addEventListener('click', speakFn);
    });

    document.getElementById('creed-text').textContent = MissionData.gospel.apostlesCreed;
    document.getElementById('lords-prayer-text').textContent = MissionData.gospel.lordsPrayer;

    // 사도신경 TTS
    const creedTitle = document.getElementById('btn-creed-tts');
    creedTitle.addEventListener('click', () => {
      this.speakEnglish(MissionData.gospel.apostlesCreed, creedTitle.querySelector('.tts-btn'));
    });

    // 주기도문 TTS
    const prayerTitle = document.getElementById('btn-prayer-tts');
    prayerTitle.addEventListener('click', () => {
      this.speakEnglish(MissionData.gospel.lordsPrayer, prayerTitle.querySelector('.tts-btn'));
    });
  },

  // TTS 공통 함수
  speakEnglish(text, btn) {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (btn) btn.classList.remove('speaking');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    if (btn) {
      btn.classList.add('speaking');
      utterance.onend = () => btn.classList.remove('speaking');
      utterance.onerror = () => btn.classList.remove('speaking');
    }
    window.speechSynthesis.speak(utterance);
  },

  // ===== 선교평가서 =====
  renderEvaluation() {
    const container = document.getElementById('eval-form');
    const saved = Storage.getEvaluation();

    container.innerHTML = MissionData.evaluation.map((q, i) => {
      const savedVal = saved['q' + i] || '';
      if (q.type === 'slider') {
        const val = savedVal || 50;
        return `<div class="eval-question">
          <label><span class="q-number">${i + 1}</span>${q.question}</label>
          <div class="eval-slider-value" data-slider-val="${i}">${val}%</div>
          <input type="range" class="eval-slider" min="0" max="100" step="10" value="${val}" data-q="${i}">
          <div class="eval-slider-labels"><span>1%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span></div>
        </div>`;
      } else if (q.type === 'fill') {
        return `<div class="eval-question">
          <label><span class="q-number">${i + 1}</span>${q.question.replace('__________________', '')}</label>
          <div style="display:flex;align-items:center;gap:8px">
            <span>나에게 있어서 단기선교는</span>
            <input type="text" class="text-input" style="flex:1" data-q="${i}" value="${this.escapeAttr(savedVal)}" placeholder="입력하세요">
            <span>(이)다.</span>
          </div>
        </div>`;
      } else {
        return `<div class="eval-question">
          <label><span class="q-number">${i + 1}</span>${q.question}</label>
          <textarea class="text-input" rows="3" data-q="${i}" placeholder="자유롭게 작성하세요...">${this.escapeHtml(savedVal)}</textarea>
        </div>`;
      }
    }).join('');

    container.querySelectorAll('.eval-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const i = slider.dataset.q;
        container.querySelector(`[data-slider-val="${i}"]`).textContent = slider.value + '%';
      });
    });

    document.getElementById('btn-save-eval').addEventListener('click', () => {
      const data = {};
      MissionData.evaluation.forEach((q, i) => {
        if (q.type === 'slider') {
          data['q' + i] = container.querySelector(`input[data-q="${i}"]`).value;
        } else if (q.type === 'fill') {
          data['q' + i] = container.querySelector(`input[data-q="${i}"]`).value;
        } else {
          data['q' + i] = container.querySelector(`textarea[data-q="${i}"]`).value;
        }
      });
      Storage.saveEvaluation(data);
      document.getElementById('eval-save-status').textContent = '저장되었습니다';
      setTimeout(() => {
        document.getElementById('eval-save-status').textContent = '';
      }, 2000);
    });
  },

  // ===== Service Worker 등록 =====
  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  // ===== 유틸리티 =====
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  escapeAttr(text) {
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};

const CACHE_NAME = 'mission-2026-v24';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/album_data.js',
  './js/storage.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './images/bg/bohol_hills.jpg',
  './images/bg/bohol_beach.jpg',
  './images/bg/church.jpg',
  './images/bg/prayer.jpg',
  './images/bg/cross.jpg',
  './images/team_photo.jpg',
  './images/church_logo.png',
  './images/ppt/slide_1.png',
  './images/ppt/slide_2.png',
  './images/ppt/slide_3.png',
  './images/ppt/slide_4.png',
  './images/ppt/slide_5.png',
  './images/ppt/slide_6.png',
  './images/ppt/slide_7.png',
  './images/ppt/slide_8.png',
  './images/songs/song_1.png',
  './images/songs/song_2.png',
  './images/songs/song_3.png',
  './images/songs/song_4.png',
  './images/songs/song_5.png',
  './images/songs/song_6.png',
  './images/songs/song_7.png',
  './images/songs/song_8.png',
  './images/songs/song_9.png',
  './images/songs/song_10.png',
  './images/songs/song_11.png',
  './images/songs/song_12.png',
  './images/songs/song_theme2.png',
  './audio/ceb_01.mp3',
  './audio/ceb_02.mp3',
  './audio/ceb_03.mp3',
  './audio/ceb_04.mp3',
  './audio/ceb_05.mp3',
  './audio/ceb_06.mp3',
  './audio/ceb_07.mp3',
  './audio/ceb_08.mp3',
  './audio/ceb_09.mp3',
  './audio/ceb_10.mp3',
  './audio/ceb_11.mp3'
];

// 설치 시 캐시
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 활성화 시 이전 캐시 제거
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선 → 실패 시 캐시 (자동 업데이트)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 네트워크 성공 시 캐시도 갱신
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // 오프라인일 때만 캐시 사용
        return caches.match(event.request)
          .then(response => response || caches.match('./index.html'));
      })
  );
});

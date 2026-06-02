// ===== 설정 (여기만 수정하면 됩니다) =====
const START_DATE = new Date(2026, 3, 29); // 2026년 4월 29일 (월은 0부터: 3 = 4월)
const START_DAY_IS_ONE = true;            // true = 시작한 날이 D+1

const DIARY_PAGE = 20;  // 다이어리 한 번에 불러올 개수 (무한 스크롤)
const GB_LIMIT = 50;    // 방명록 최신 50개만 표시

// 🎵 BGM 곡 목록 — 유튜브 영상 ID로 교체하세요 (주소의 v= 뒤 부분)
const SONGS = [
  { title: "우리 노래 ❤️", id: "dQw4w9WgXcQ" },
  { title: "추억의 BGM 🎶", id: "9bZkp7q19f0" },
];

// ▼▼▼ Firebase 설정: Firebase 콘솔에서 복사해서 붙여넣으세요 ▼▼▼
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC06p2nLqcAx4RVcDuPekUtV4uChZka1Bg",
  authDomain: "hiii-94429.firebaseapp.com",
  projectId: "hiii-94429",
  storageBucket: "hiii-94429.firebasestorage.app",
  messagingSenderId: "106469587938",
  appId: "1:106469587938:web:d70d1883de0224446257bb",
  measurementId: "G-XHCGH5655W",
};
// ▲▲▲ Firebase 설정 끝 ▲▲▲

const SAMPLE_DIARY = [
  { author: "자기야", avatar: "👧", title: "한강 데이트 🌉", body: "자전거 타고 치킨 먹었던 날. 완전 행복했어!", when: "2026.05.30" },
  { author: "나", avatar: "🧑", title: "영화 봤다 🎬", body: "팝콘 다 먹고 손 잡고 봤지. 또 보자~", when: "2026.05.15" },
  { author: "나", avatar: "🧑", title: "우리 1일 ❤️", body: "오늘부터 우리 1일! 잘 부탁해 😚", when: "2026.04.29" },
];
const SAMPLE_GUESTBOOK = [
  { name: "자기야", avatar: "👧", text: "오늘도 사랑해 ❤️ 보고싶다", when: "방금 전" },
  { name: "나", avatar: "🧑", text: "우리 미니홈피 생겼다!! 매일 들어와줘", when: "어제" },
];
// =========================================

// ---------- 공통 유틸 ----------
const $ = (id) => document.getElementById(id);
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function formatDate(ts) {
  if (!ts || !ts.toDate) return "방금";
  return ts.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function formatWhen(ts) {
  if (!ts || !ts.toDate) return "방금 전";
  const d = ts.toDate();
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return Math.floor(diff / 60) + "분 전";
  if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

// ---------- D-day ----------
function daysSince(start) {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round((a - b) / 86400000) + (START_DAY_IS_ONE ? 1 : 0);
}
const n = daysSince(START_DATE);
$("today").textContent = `D+${n}`;
$("ddayText").textContent = `D+${n}`;
$("sinceText").textContent =
  START_DATE.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) + " 부터";

// ---------- 탭 전환 ----------
document.querySelectorAll(".cy-tabs .tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".cy-tabs .tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
  });
});

// ---------- BGM (유튜브) ----------
const bgmList = $("bgmList");
const bgmFrame = $("bgmFrame");
function playSong(i, autoplay) {
  bgmFrame.src = `https://www.youtube.com/embed/${SONGS[i].id}?rel=0${autoplay ? "&autoplay=1" : ""}`;
  [...bgmList.children].forEach((b, idx) => b.classList.toggle("playing", idx === i));
}
bgmList.innerHTML = SONGS.map((s, i) => `<button data-i="${i}">♪ ${escapeHtml(s.title)}</button>`).join("");
[...bgmList.children].forEach(b => b.addEventListener("click", () => playSong(+b.dataset.i, true)));
if (SONGS.length) playSong(0, false);

// ---------- 렌더 헬퍼 ----------
function diaryEntryHtml(d, id) {
  const meta = `${escapeHtml(d.when || "")}${d.author ? " · " + escapeHtml(d.author) + " " + (d.avatar || "") : ""}`;
  const actions = id ? `
    <div class="entry-actions">
      <button data-act="edit" data-id="${id}">수정</button>
      <button data-act="del" data-id="${id}">삭제</button>
    </div>` : "";
  return `
    <div class="diary-entry">
      <div class="date">${meta}</div>
      ${d.title ? `<div class="title">${escapeHtml(d.title)}</div>` : ""}
      <div class="body">${escapeHtml(d.body)}</div>
      ${actions}
    </div>`;
}
function gbEntryHtml(g) {
  return `
    <div class="gb-entry">
      <div class="avatar">${g.avatar || "🙂"}</div>
      <div class="gb-content">
        <div class="gb-name">${escapeHtml(g.name)}<span class="when">${escapeHtml(g.when || "")}</span></div>
        <div class="gb-text">${escapeHtml(g.text)}</div>
      </div>
    </div>`;
}

// ---------- DOM refs ----------
const diaryEl = $("diary"), recentEl = $("recentDiary"), diarySentinel = $("diarySentinel");
const diaryStatus = $("diaryStatus"), diaryName = $("diaryName"), diaryTitle = $("diaryTitle");
const diaryBody = $("diaryBody"), diarySubmit = $("diarySubmit");
const gbEl = $("guestbook"), gbStatus = $("gbStatus"), gbName = $("gbName"), gbText = $("gbText"), gbSubmit = $("gbSubmit");
const moodNa = $("moodNa"), moodJagi = $("moodJagi");

const configured = !FIREBASE_CONFIG.apiKey.startsWith("PASTE");

if (!configured) {
  // ===== 미리보기 (Firebase 설정 전) =====
  recentEl.innerHTML = SAMPLE_DIARY.slice(0, 4).map(d => diaryEntryHtml(d)).join("");
  diaryEl.innerHTML = SAMPLE_DIARY.map(d => diaryEntryHtml(d)).join("");
  gbEl.innerHTML = SAMPLE_GUESTBOOK.map(gbEntryHtml).join("");
  const note = "⚙️ Firebase 설정 전이라 미리보기 상태예요.";
  diaryStatus.textContent = note;
  gbStatus.textContent = note;
  [diarySubmit, diaryTitle, diaryBody, gbSubmit, gbText].forEach(el => el.disabled = true);

  // 기분은 로컬에 저장 (이 기기에서만)
  const local = JSON.parse(localStorage.getItem("mood") || "{}");
  moodNa.textContent = local.na || "-";
  moodJagi.textContent = local.jagi || "-";
  document.querySelectorAll(".mood-row").forEach(row => {
    const who = row.dataset.who;
    row.querySelectorAll(".mood-pick button").forEach(btn => {
      btn.addEventListener("click", () => {
        local[who] = btn.dataset.mood;
        localStorage.setItem("mood", JSON.stringify(local));
        (who === "na" ? moodNa : moodJagi).textContent = btn.dataset.mood;
      });
    });
  });
} else {
  // ===== Firebase 연결 =====
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const {
    getFirestore, collection, doc, addDoc, getDocs, updateDoc, deleteDoc,
    setDoc, onSnapshot, query, orderBy, limit, startAfter, serverTimestamp,
  } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

  // ----- 기분 (실시간 동기화) -----
  const moodRef = doc(db, "state", "mood");
  onSnapshot(moodRef, (snap) => {
    const m = snap.data() || {};
    moodNa.textContent = m.na || "-";
    moodJagi.textContent = m.jagi || "-";
  });
  document.querySelectorAll(".mood-row").forEach(row => {
    const who = row.dataset.who;
    row.querySelectorAll(".mood-pick button").forEach(btn => {
      btn.addEventListener("click", () => setDoc(moodRef, { [who]: btn.dataset.mood }, { merge: true }));
    });
  });

  // ----- 다이어리 (무한 스크롤 + 수정/삭제) -----
  const diaryCol = collection(db, "diary");
  let lastDoc = null, loading = false, hasMore = true;

  async function loadDiary(reset) {
    if (loading) return;
    loading = true;
    try {
      if (reset) { diaryEl.innerHTML = ""; lastDoc = null; hasMore = true; }
      if (!hasMore) return;
      const base = [orderBy("createdAt", "desc")];
      const q = lastDoc
        ? query(diaryCol, ...base, startAfter(lastDoc), limit(DIARY_PAGE))
        : query(diaryCol, ...base, limit(DIARY_PAGE));
      const snap = await getDocs(q);
      if (!snap.empty) {
        lastDoc = snap.docs[snap.docs.length - 1];
        diaryEl.insertAdjacentHTML("beforeend",
          snap.docs.map(d => diaryEntryHtml({ ...d.data(), when: formatDate(d.data().createdAt) }, d.id)).join(""));
      }
      if (snap.size < DIARY_PAGE) hasMore = false;
      if (reset && snap.empty) diaryEl.innerHTML = `<p class="gb-status">아직 일기가 없어요. 첫 일기를 써보세요!</p>`;
    } catch (e) {
      diaryStatus.textContent = "⚠️ 일기를 불러오지 못했어요: " + e.message;
    } finally { loading = false; }
  }

  // 무한 스크롤
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore && !loading) loadDiary(false);
  }, { rootMargin: "120px" }).observe(diarySentinel);

  // 최근 4개 (홈, 실시간)
  onSnapshot(query(diaryCol, orderBy("createdAt", "desc"), limit(4)), (snap) => {
    recentEl.innerHTML = snap.empty
      ? `<p class="gb-status">아직 일기가 없어요.</p>`
      : snap.docs.map(d => diaryEntryHtml({ ...d.data(), when: formatDate(d.data().createdAt) })).join("");
  });

  // 쓰기
  diarySubmit.addEventListener("click", async () => {
    const title = diaryTitle.value.trim(), body = diaryBody.value.trim();
    if (!title && !body) return;
    const [author, avatar] = diaryName.value.split("|");
    diarySubmit.disabled = true;
    try {
      await addDoc(diaryCol, { author, avatar, title, body, createdAt: serverTimestamp() });
      diaryTitle.value = ""; diaryBody.value = ""; diaryStatus.textContent = "";
      await loadDiary(true);
    } catch (e) { diaryStatus.textContent = "⚠️ 저장 실패: " + e.message; }
    finally { diarySubmit.disabled = false; }
  });

  // 수정 / 삭제 (이벤트 위임)
  diaryEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === "del") {
      if (!confirm("이 일기를 삭제할까요?")) return;
      await deleteDoc(doc(db, "diary", id));
      await loadDiary(true);
    } else if (btn.dataset.act === "edit") {
      const entry = btn.closest(".diary-entry");
      const oldTitle = entry.querySelector(".title")?.textContent || "";
      const oldBody = entry.querySelector(".body")?.textContent || "";
      const title = prompt("제목 수정:", oldTitle);
      if (title === null) return;
      const body = prompt("내용 수정:", oldBody);
      if (body === null) return;
      await updateDoc(doc(db, "diary", id), { title, body });
      await loadDiary(true);
    }
  });

  loadDiary(true);

  // ----- 방명록 (실시간, 최신 50개) -----
  const gbCol = collection(db, "guestbook");
  onSnapshot(query(gbCol, orderBy("createdAt", "desc"), limit(GB_LIMIT)), (snap) => {
    gbEl.innerHTML = snap.empty
      ? `<p class="gb-status">아직 글이 없어요. 첫 메시지를 남겨보세요!</p>`
      : snap.docs.map(d => gbEntryHtml({ ...d.data(), when: formatWhen(d.data().createdAt) })).join("");
  }, (err) => { gbStatus.textContent = "⚠️ 방명록을 불러오지 못했어요: " + err.message; });

  async function postGb() {
    const text = gbText.value.trim();
    if (!text) return;
    const [name, avatar] = gbName.value.split("|");
    gbSubmit.disabled = true;
    try {
      await addDoc(gbCol, { name, avatar, text, createdAt: serverTimestamp() });
      gbText.value = ""; gbStatus.textContent = "";
    } catch (e) { gbStatus.textContent = "⚠️ 저장 실패: " + e.message; }
    finally { gbSubmit.disabled = false; }
  }
  gbSubmit.addEventListener("click", postGb);
  gbText.addEventListener("keydown", e => { if (e.key === "Enter") postGb(); });
}

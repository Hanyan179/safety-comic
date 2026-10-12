const DB = 'safety-story-recordings';
async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('voices');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readRecording(sceneId, role) {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('voices').objectStore('voices').get(`${sceneId}:${role}`);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
export async function saveRecording(sceneId, role, value) {
  const db = await database();
  try { await new Promise((resolve, reject) => {
    const tx = db.transaction('voices', 'readwrite');
    const store = tx.objectStore('voices');
    if (value) store.put(value, `${sceneId}:${role}`); else store.delete(`${sceneId}:${role}`);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('录音保存未完成'));
  }); } finally { db.close(); }
}
export function audioDuration(src) {
  return new Promise((resolve, reject) => {
    const player = new Audio();
    const clean = () => { player.removeAttribute('src'); player.load(); };
    const timer = setTimeout(() => { clean(); reject(new Error('录音读取超时，请换一个音频文件。')); }, 12000);
    player.onloadedmetadata = () => { clearTimeout(timer); const duration = player.duration; clean(); Number.isFinite(duration) && duration > .2 && duration <= 300 ? resolve(duration) : reject(new Error('请使用 0.2 秒至 5 分钟的录音。')); };
    player.onerror = () => { clearTimeout(timer); clean(); reject(new Error('这个音频格式暂时无法播放，请使用 MP3、WAV 或 M4A。')); };
    player.src = src;
  });
}

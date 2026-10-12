import { useCallback, useEffect, useRef, useState } from 'react';
import scenes from './scenes.json';
import { StoryPlayer } from './motion/StoryPlayer.jsx';
import { SpeakerAvatar } from './SpeakerAvatar.jsx';

const pages = [
  { title: '平平安安出门去', subtitle: '过马路、看消息、出门前的小约定', label: '出门安全' },
  { title: '勇敢说不，学会求助', subtitle: '遇到陌生人，先保护好自己', label: '自我保护' },
  { title: '身边的小事，安全的大事', subtitle: '在家里、在水边，都要多留心', label: '生活安全' },
  { title: '守护自己，也守护家人', subtitle: '远离危险，一起识破电话里的骗局', label: '家人守护' },
];
const pad = value => String(value).padStart(2, '0');
export function sceneFromHash(hash) {
  if (hash === '#motion') return 0;
  const match = /^#story-(\d+)$/.exec(hash);
  const index = match ? Number(match[1]) - 1 : -1;
  return index >= 0 && index < scenes.length ? index : null;
}

export function App() {
  const [focus, setFocus] = useState(() => sceneFromHash(window.location.hash));
  const [page, setPage] = useState(() => Math.floor((sceneFromHash(window.location.hash) || 0) / 6));
  const [autoplay, setAutoplay] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [notice, setNotice] = useState('');
  const restoreCard = useRef(null);
  useEffect(() => {
    const syncRoute = () => {
      const index = sceneFromHash(window.location.hash);
      setFocus(index); setAutoplay(false);
      if (index !== null) { setPage(Math.floor(index / 6)); restoreCard.current = index; }
    };
    const syncFullscreen = () => setFullScreen(Boolean(document.fullscreenElement));
    window.addEventListener('hashchange', syncRoute);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => { window.removeEventListener('hashchange', syncRoute); document.removeEventListener('fullscreenchange', syncFullscreen); };
  }, []);
  function openScene(index, replace = false) {
    restoreCard.current = index;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `#story-${index + 1}`);
    setFocus(index); setPage(Math.floor(index / 6)); setAutoplay(true);
    window.scrollTo(0, 0);
  }
  const closeStory = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setFocus(null); setAutoplay(false);
  }, []);
  useEffect(() => {
    if (focus === null && restoreCard.current !== null) document.getElementById(`scene-${restoreCard.current}`)?.focus({preventScroll:true});
  }, [focus]);
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setNotice('当前浏览器暂不支持全屏，可以使用浏览器的全屏功能。'); }
  }
  if (focus !== null) return <StoryPlayer key={focus} scene={scenes[focus]} autoPlay={autoplay} onClose={closeStory} onNext={() => focus < scenes.length - 1 ? openScene(focus + 1, true) : closeStory()} />;
  return <main className="app">
    <header className="topbar"><span className="series-label">缪胥衍与冰淇淋 · 安全小课堂</span><button className="quiet-button" onClick={toggleFullscreen}>{fullScreen ? '退出全屏' : '全屏阅读'}</button></header>
    <section className="comic-paper" aria-label={`第 ${page + 1} 页，${pages[page].title}`}>
      <header className="paper-heading"><div className="book-title"><p>和好朋友一起，学会保护自己</p><h1>缪胥衍与冰淇淋</h1></div><div className="chapter-heading"><span className="chapter-stamp">第 {['一','二','三','四'][page]} 话</span><div><h2>{pages[page].title}</h2><p>{pages[page].subtitle}</p></div></div></header>
      <div className="comic-grid">{scenes.slice(page * 6, page * 6 + 6).map((scene, slot) => <button className="panel story-panel" id={`scene-${scene.id - 1}`} key={scene.id} onClick={() => openScene(scene.id - 1)} aria-label={`第 ${scene.id} 个故事：${scene.title}，点击播放`}>
        <div className="panel-image"><img src={scene.image} alt={`${scene.title}的故事画面`} width="1672" height="941" draggable="false" fetchPriority={slot < 3 ? 'high' : 'auto'} /><span className="scene-number">{pad(scene.id)}</span><span className="story-play-symbol" aria-hidden="true">▶</span></div>
        <div className="panel-caption"><h3>{scene.title}</h3><span className="story-action">看故事</span></div>
      </button>)}</div>
      <footer className="paper-footer"><span>点开一格看故事，讲完一起选一选</span><span>{pad(page * 6 + 1)}—{pad(page * 6 + 6)} / 24 个故事</span></footer>
    </section>
    <nav className="reading-dock" aria-label="故事分页"><div className="page-tabs">{pages.map((item, index) => <button key={item.label} className={page === index ? 'selected' : ''} onClick={() => setPage(index)} aria-current={page === index ? 'page' : undefined}><span>{pad(index + 1)}</span>{item.label}</button>)}</div><span className="dock-divider"/><button className="play-button" onClick={() => openScene(page * 6)}>从这一页开始</button></nav>
    <div className="character-legend"><span><SpeakerAvatar role="boy"/>缪胥衍</span><span><SpeakerAvatar role="cat"/>冰淇淋</span><p>看故事 · 选一选 · 记住啦</p></div>
    {notice && <p role="status">{notice}</p>}
  </main>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import scenes from '../scenes.json';
import voices from '../voices.json';
import { LessonQuiz } from '../LessonQuiz.jsx';
import { SpeakerAvatar } from '../SpeakerAvatar.jsx';
import { CHARACTERS } from '../characters.mjs';
import { readRecording, saveRecording, audioDuration } from '../recordings.mjs';
import { FRAME, chapterAt, captionAt, createStory } from './story.mjs';
import { renderMotionFrame } from './render.mjs';
import './motion.css';
const clock = time => `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`;
const loadImage = src => new Promise((resolve,reject) => { const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error('头像或场景图未能载入，请刷新重试。')); image.src=src; });

export function StoryPlayer({ scene, autoPlay, onClose, onNext }) {
  const [assets,setAssets]=useState(null), [recordings,setRecordings]=useState({}), [recordingsReady,setRecordingsReady]=useState(false);
  const [time,setTime]=useState(0), [playing,setPlaying]=useState(autoPlay), [muted,setMuted]=useState(false), [reducedMotion,setReducedMotion]=useState(false);
  const [error,setError]=useState(''), [audioNotice,setAudioNotice]=useState(''), [seekVersion,setSeekVersion]=useState(0), [saving,setSaving]=useState(false);
  const canvas=useRef(null),audio=useRef(null),cursor=useRef(0),section=useRef(null),localURLs=useRef(new Set());
  const story=useMemo(()=>createStory(scene,{...voices[scene.id],...recordings}),[scene,recordings]);
  const chapter=chapterAt(story,time),caption=captionAt(story,time),ended=time>=story.duration;
  const ready=Boolean(assets && recordingsReady);
  const activeAudio=story.audio.find(clip=>time>=clip.start && time<clip.end);
  const pageStart=Math.floor((scene.id-1)/6)*6;
  useEffect(()=>{
    let active=true;
    Promise.all([Promise.all(scenes.slice(pageStart,pageStart+6).map(item=>loadImage(item.image))),loadImage(CHARACTERS.boy.avatar),loadImage(CHARACTERS.cat.avatar)])
      .then(([images,boy,cat])=>{if(active)setAssets({images,avatars:{boy,cat}});}).catch(e=>{if(active)setError(e.message);});
    Promise.all(['boy','cat'].map(async role=>{
      const saved=await readRecording(scene.id,role);
      if(!saved || !active)return null;
      const src=URL.createObjectURL(saved.blob);localURLs.current.add(src);
      return [role,{src,duration:saved.duration,name:saved.name}];
    })).then(entries=>{if(active)setRecordings(Object.fromEntries(entries.filter(Boolean)));})
      .catch(()=>{if(active)setAudioNotice('本机录音暂时无法读取，先使用原有声音。');})
      .finally(()=>{if(active)setRecordingsReady(true);});
    section.current?.focus({preventScroll:true});
    return ()=>{active=false;for(const url of localURLs.current)URL.revokeObjectURL(url);localURLs.current.clear();};
  },[scene.id,pageStart]);
  useEffect(()=>{const pref=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReducedMotion(pref.matches);update();pref.addEventListener('change',update);return()=>pref.removeEventListener('change',update);},[]);
  useEffect(()=>{if(ready && canvas.current)renderMotionFrame(canvas.current.getContext('2d'),{assets:assets.images,avatars:assets.avatars,scenes:scenes.slice(pageStart,pageStart+6),story},time,{reducedMotion});},[ready,assets,pageStart,story,time,reducedMotion]);
  useEffect(()=>{
    if(!playing || !ready)return;
    let frame,last=performance.now();
    const tick=now=>{cursor.current=Math.min(story.duration,cursor.current+Math.max(0,now-last)/1000);last=now;setTime(cursor.current);if(cursor.current>=story.duration)setPlaying(false);else frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,ready,story.duration]);
  useEffect(()=>{
    const player=audio.current;if(!player)return;
    player.pause();player.muted=muted;
    if(activeAudio && ready){
      if(player.getAttribute('src')!==activeAudio.src)player.src=activeAudio.src;
      player.currentTime=Math.max(0,cursor.current-activeAudio.start);
      if(playing)player.play().catch(()=>setAudioNotice('声音暂时没能播放，可暂停后再继续。'));
    }
    return()=>player.pause();
  },[activeAudio?.src,activeAudio?.start,playing,muted,seekVersion,ready]);
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)setPlaying(false);};
    const keyboard=event=>{if(event.key==='Escape'){setPlaying(false);onClose();}};
    document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',keyboard);
    return()=>{document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',keyboard);};
  },[onClose]);
  function seek(value){setPlaying(false);cursor.current=Math.min(story.duration,Math.max(0,Number(value)));setTime(cursor.current);setSeekVersion(v=>v+1);}
  function replay(){cursor.current=0;setTime(0);setSeekVersion(v=>v+1);setAudioNotice('');setPlaying(true);}
  async function upload(role,event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    seek(0);setSaving(true);setAudioNotice('');let src;
    try{
      if(file.size>30*1024*1024)throw new Error('请使用小于 30 MB 的录音。');
      src=URL.createObjectURL(file);const duration=await audioDuration(src);
      await saveRecording(scene.id,role,{blob:file,duration,name:file.name});
      const old=recordings[role]?.src;if(old){URL.revokeObjectURL(old);localURLs.current.delete(old);}
      localURLs.current.add(src);setRecordings(current=>({...current,[role]:{src,duration,name:file.name}}));
      setAudioNotice(`${CHARACTERS[role].name}的录音已替换，故事会按录音长度播放。`);
    }catch(e){if(src)URL.revokeObjectURL(src);setAudioNotice(e.message || '录音没有保存成功，请重试。');}finally{setSaving(false);}
  }
  async function restore(role){
    seek(0);setSaving(true);
    try{await saveRecording(scene.id,role,null);const old=recordings[role]?.src;if(old){URL.revokeObjectURL(old);localURLs.current.delete(old);}setRecordings(current=>{const next={...current};delete next[role];return next;});setAudioNotice('已恢复原有声音。');}
    catch{setAudioNotice('暂时无法恢复，请稍后重试。');}finally{setSaving(false);}
  }
  if(ended)return <LessonQuiz scene={scene} onReplay={replay} onNext={onNext} onClose={onClose}/>;
  const role=caption?.role || 'cat';
  return <main className="motion-player" ref={section} tabIndex={-1} data-story-id={scene.id}>
    <header className="motion-heading"><button className="quiet-button" onClick={onClose}>返回故事地图</button><div><p>缪胥衍与冰淇淋 · 第 {scene.id} 个故事</p><h1>{scene.title}</h1></div><span className="motion-edition">看完来选一选</span></header>
    <nav className="lesson-steps" aria-label="学习步骤"><span className="active">1 看故事</span><span>2 选一选</span><span>3 记住啦</span></nav>
    <div className="motion-stage" aria-busy={!ready}><canvas ref={canvas} width={FRAME.width} height={FRAME.height} role="img" aria-label={`动态故事：${scene.title}。${caption ? `${CHARACTERS[caption.role].name}：${caption.text}`:chapter.label}`}/>{!ready && <div className="motion-loading">{error || '正在准备故事…'}</div>}</div>
    <div className={`mobile-caption character-caption ${role}`}><SpeakerAvatar role={role}/><p>{caption?.text || scene.title}</p></div>
    <audio ref={audio} preload="auto" aria-label="故事配音"/>
    <section className="motion-transport" aria-label="故事播放控制"><div className="motion-play-row"><button className="motion-play" disabled={!ready||saving} onClick={()=>setPlaying(value=>!value)}>{playing ? '暂停故事' : time>0 ? '继续看' : '开始看故事'}</button><button disabled={!ready||saving} onClick={replay}>从头播放</button><span className="motion-time"><span>{clock(time)}</span> / {clock(story.duration)}</span><span className="motion-status" role="status">{chapter.label}</span>{story.audio.length>0 && <button onClick={()=>setMuted(v=>!v)} aria-pressed={!muted}>{muted?'声音：关':'声音：开'}</button>}</div><input className="motion-seek" type="range" min="0" max={story.duration} step="0.1" value={time} disabled={!ready||saving} aria-label="故事进度" aria-valuetext={`${time.toFixed(1)} 秒，${chapter.label}`} onChange={e=>seek(e.target.value)}/></section>
    {error && <p role="alert" className="motion-notice">{error}</p>}
    <details className="motion-transcript"><summary>给老师和家长：分段查看与录音</summary>
      <div className="motion-chapters" aria-label="分段定位">{story.chapters.filter(item=>!['overview','enter'].includes(item.id)).map(item=><button key={item.id} onClick={()=>seek(item.start+.4)} aria-current={chapter.id===item.id?'step':undefined}><span>{clock(item.start)}</span>{item.label}</button>)}</div>
      <div className="transcript-dialogue"><div className="character-caption boy"><SpeakerAvatar role="boy"/><p>{story.question}</p></div><div className="character-caption cat"><SpeakerAvatar role="cat"/><p>{story.answer}</p></div></div>
      <section className="recording-tools" aria-label="角色录音"><h2>换上自己的声音</h2><p>每位角色上传一段完整录音，字幕会按录音长度分段。录音只保存在本机浏览器，不会上传。</p><div className="recording-roles">{['boy','cat'].map(role=><div key={role} className={`recording-role ${role}`}><SpeakerAvatar role={role}/><div><strong>{CHARACTERS[role].name}</strong><span>{recordings[role]?.name || (role==='cat' && scene.id===1 ? '可爱声音试听 · 本机合成' : '等待录音，现在先看字幕')}</span></div><label className="recording-upload">{saving?'保存中…':'选择录音'}<input type="file" accept="audio/*,.m4a,.mp3,.wav" disabled={saving} aria-label={`${CHARACTERS[role].name}录音`} onChange={event=>upload(role,event)}/></label>{recordings[role]&&<button disabled={saving} onClick={()=>restore(role)}>恢复</button>}</div>)}</div></section>
      {audioNotice&&<p role="status" className="motion-notice">{audioNotice}</p>}
      <footer className="motion-info"><p>当前为图片镜头动画。角色自身动作与正式配音可继续制作。{scene.id===1?'下载版使用默认猫咪试听声音；本机替换录音只用于网页。':''}</p>{scene.id===1&&<a href="motion/safety-scene-01.mp4" download="缪胥衍与冰淇淋-绿灯先观察.mp4">下载第一格视频</a>}</footer>
    </details>
  </main>;
}

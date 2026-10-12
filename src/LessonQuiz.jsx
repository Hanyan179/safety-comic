import { useEffect, useRef, useState } from 'react';
import { SpeakerAvatar } from './SpeakerAvatar.jsx';
import { quizFor } from './quizzes.mjs';

export function LessonQuiz({ scene, onReplay, onNext, onClose }) {
  const quiz = quizFor(scene.id);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const heading = useRef(null);
  const feedback = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }, []);
  function choose(index) {
    if (done) return;
    setSelected(index);
    setDone(index === quiz.correct);
    requestAnimationFrame(() => feedback.current?.focus({ preventScroll: true }));
  }

  return (
    <main className="quiz-page">
      <header className="lesson-top"><button onClick={onClose}>返回故事地图</button><span>缪胥衍与冰淇淋 · 安全小课堂</span><span className="lesson-count">第 {scene.id} 个故事</span></header>
      <nav className="lesson-steps" aria-label="学习步骤"><span>1 看故事</span><span className={!done ? 'active' : ''}>2 选一选</span><span className={done ? 'active' : ''}>3 记住啦</span></nav>
      <section className="quiz-layout">
        <div className="quiz-picture"><img src={scene.image} alt={scene.title} /><div className="quiz-picture-label"><span>冰淇淋的小提醒</span><p>{scene.title}</p></div><div className="quiz-buddy"><SpeakerAvatar role="cat"/><p>{done ? '这次你记住啦，出门也要做到哦！' : '故事讲完啦，现在轮到你来选！'}</p></div></div>
        <div className="quiz-card"><p className="quiz-eyebrow">{done ? '安全小达人' : '轮到你啦'}</p><h1 ref={heading} tabIndex={-1}>{done ? '你记住啦！' : quiz.prompt}</h1><p className="quiz-guidance">{done ? quiz.prompt : '选一个你觉得安全的做法。'}</p>
          <div className="quiz-options">{quiz.options.map((option, i) => <button key={option} className={`quiz-option ${selected === i ? done ? 'correct' : 'try-again' : ''}`} onClick={() => choose(i)} disabled={done} aria-pressed={selected === i}><span className="option-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{selected === i && <small>{done ? '选对啦' : '再想一想'}</small>}</button>)}</div>
          {selected !== null && <div className={`quiz-feedback ${done ? 'is-correct' : ''}`} ref={feedback} tabIndex={-1} role="status"><SpeakerAvatar role="cat"/><strong>{done ? '你记住啦' : '再想一想，没关系'}</strong><p>{done ? quiz.success : quiz.hint}</p></div>}
          <footer className="quiz-actions"><button className="replay-lesson" onClick={onReplay}>再看一遍</button>{done && <button className="next-lesson" onClick={onNext}>{scene.id < 24 ? '下一个故事' : '回到故事地图'}</button>}</footer>
        </div>
      </section>
    </main>
  );
}

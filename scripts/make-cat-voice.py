"""Build a local synthetic voice audition for Icecream, without network services."""
from pathlib import Path
import json, subprocess, tempfile
ROOT=Path(__file__).resolve().parent.parent
scene=json.loads((ROOT/'src/scenes.json').read_text())[0]
answer=scene['answer']
cuts=[answer.index(key) for key in ['要看','再看看','确认安全后']]
parts=[answer[:cuts[0]],answer[cuts[0]:cuts[1]],answer[cuts[1]:cuts[2]],answer[cuts[2]:]]
out=ROOT/'public/audio/scene-01';out.mkdir(parents=True,exist_ok=True)
clips=[]
with tempfile.TemporaryDirectory(prefix='safety-cat-voice-') as directory:
    temp=Path(directory)
    for i,line in enumerate(parts,1):
        text=temp/f'{i}.txt';text.write_text(line)
        source=temp/f'{i}.aiff'
        subprocess.run(['say','-v','Tingting','-r','195','-f',str(text),'-o',str(source)],check=True)
        rate=int(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=sample_rate','-of','csv=p=0',str(source)],text=True).strip())
        target=out/f'cat-{i}.mp3'
        # Slightly brighter tone while keeping the words at a comfortable speed.
        filters=f'asetrate={round(rate*1.14)},aresample=48000,atempo={1/1.14:.6f},alimiter=limit=0.92'
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af',filters,'-c:a','libmp3lame','-q:a','2',str(target)],check=True)
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(target)],text=True).strip())
        clips.append({'src':f'audio/scene-01/cat-{i}.mp3','duration':duration})
(ROOT/'src/voices.json').write_text(json.dumps({'1':{'cat':clips}},ensure_ascii=False,indent=2)+'\n')
print('Saved 4 cat voice audition clips and measured durations.')

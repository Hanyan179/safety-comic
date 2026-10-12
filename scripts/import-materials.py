"""Import numbered dialogue and scene pairs without changing source files."""
import json
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image

project = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else project.parent
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with zipfile.ZipFile(source / "哈宝与冰淇淋的对话内容.docx") as doc:
    tree = ET.fromstring(doc.read("word/document.xml"))
    paragraphs = ["".join(t.text or "" for t in p.findall(".//w:t", ns))
                  for p in tree.findall(".//w:p", ns)]
text = "\n".join(paragraphs)
pairs = re.findall(r"(?:^|\n)(\d+)\.\s*问[：:]\s*(.*?)\s*答[：:]\s*(.*?)(?=\n\d+\.\s*问[：:]|\Z)", text, re.S)
assert len(pairs) == 24, f"Expected 24 dialogue pairs, got {len(pairs)}"
assets = project / "public" / "scenes"
assets.mkdir(parents=True, exist_ok=True)
records = []
for number, question, answer in pairs:
    number = int(number)
    matches = list((source / "场景原图").glob(f"{number:02d}_*.png"))
    assert len(matches) == 1, f"Scene {number}: expected exactly one image"
    image = matches[0]
    with Image.open(image) as im:
        im.save(assets / f"{number:02d}.webp", "WEBP", quality=90, method=6)
    records.append({"id": number, "title": image.stem.split("_", 1)[1],
                    "question": question.strip(), "answer": answer.strip(),
                    "image": f"scenes/{number:02d}.webp", "source": image.name})
assert [p["id"] for p in records] == list(range(1, 25))
(project / "src" / "scenes.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
print(f"Imported {len(records)} original dialogue / scene pairs.")

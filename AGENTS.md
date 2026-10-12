# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 已确认的产品方向

- 小男孩对外名称统一为「缪胥衍」。保留原始需求文件名，不用历史文件名作为页面角色名。
- 儿童课堂流程采用「先讲解，再选择，再反馈」；答错允许重选，答对后由孩子主动进入下一个故事。
- 画面优先，长文字放在图片外侧或下方，避免遮挡人物和安全信息；风格采用温和、明亮的儿童绘本方向。
- 动态镜头与角色自身动作是不同交付。当前代码样片不能宣称已经生成角色动作。
- 所有画格点击后都直接进入可播放的动态故事，不再保留右上角单独的样片入口；答对后下一格也进入动态故事。
- 说话人用用户提供的头像区分；缪胥衍的对白使用绿色，冰淇淋的对白使用黄色。可见说话标签使用头像代替，保留无障碍名称。
- 当前优先精修第一格。猫咪声音可先试听；真人录音由用户后续提供，替换录音时需按实际时长同步故事。

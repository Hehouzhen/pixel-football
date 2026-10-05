# 像素绿茵：上线与后续开发交接

更新日期：2026-10-05。此文档供同一 Codex 项目中的新对话直接接手使用。先核对本文中的线上状态、Git 提交和项目文件，再继续修改；不要把过往对话中的计划当成已实现功能。

## 项目位置与发布

- 项目根目录：本文件所在的 `pixel-football/` 文件夹；在 Codex 中选择包含本文件的项目。
- GitHub 仓库：`https://github.com/Hehouzhen/pixel-football`
- GitHub Pages 公开地址：`https://hehouzhen.github.io/pixel-football/`。2026-10-05 已确认首页和主要脚本、样式返回 HTTP 200；首发工作流 `https://github.com/Hehouzhen/pixel-football/actions/runs/37300776842` 成功，游戏版本提交为 `19f59d9`。
- 本地预览：在项目目录运行 `node preview.mjs 4174`，打开 `http://127.0.0.1:4174/`。本地服务需要保持运行；关机或进程结束后要重启。
- 发布流程：推送 `main` 后，`.github/workflows/pages.yml` 在 GitHub Actions 执行 `npm ci`、`npm test`、`npm run build`，再发布 `dist/`。仓库 Settings → Pages 的 Source 必须是 **GitHub Actions**。
- 本项目以前也关联过 Sites，配置保留在 `.openai/hosting.json`；目前公开上线目标改为 GitHub Pages，不要误推送到内部 Sites 远端 `origin`。

## 当前游戏范围

- 6 对 6 像素足球，WASD 移动、鼠标瞄准和左键射门；支持传球、传中、抢断、暂停、点球与红黄牌。
- 快速比赛、训练场、俱乐部联赛和 MyCareer。联赛可亲自比赛或模拟本轮；MyCareer 固定控制自建球员并自动成长。
- 五个欧洲联赛使用真实联赛及球队名称，球员名单为原创。赛季含积分榜、球员数据、杯赛、奖项、比赛复盘和进球回放。
- 近期完成：门将手套与独立扑救动作、射门动作阶段、SIU 庆祝去除横向压扁。门将像素造型仍可继续打磨。
- 当前是浏览器单机游戏：无账号、联机对战或云端存档，也没有正式 11 人制。

## 代码地图与验证

- `src.jsx`：React 入口、页面和比赛流程；`ui.jsx`、`career-role.jsx`、`experience.jsx` 等拆分页面组件。
- `engine.mjs`：比赛物理、AI、判罚及统计；`tactics.mjs`：战术决策；`field.mjs`：球场尺寸。
- `pitch.mjs`：比赛 Canvas 绘制；`player-sprite.mjs`、`keeper-sprite.mjs`、`keeper-motion.mjs`、`celebration.mjs`：像素球员及动作。
- `league.mjs`、`clubs.mjs`、`cup.mjs`：联赛、球队和杯赛；`career.mjs`、`career-story.mjs`：个人生涯。
- `replay.mjs`、`replay.jsx`：进球回放；`practice.mjs`、`practice.jsx`：训练场。
- `save-slots.mjs`：三个本地存档槽与 JSON 备份，存储键 `pixel-pitch-saves-v2`。
- `build.mjs` 将 `src.jsx` 打包为 `dist/app.js`；`dist/index.html` 使用相对路径加载脚本和样式，适配 GitHub Pages 项目子路径。
- 修改后至少运行 `npm test` 和 `npm run build`；涉及交互或动画时再打开实际比赛画面检查。不要只凭构建成功判断玩法正确。

## 存档迁移与版本注意事项

本地预览和 GitHub Pages 是不同网站地址，浏览器不会自动共享 `localStorage`。用户若要继续本机赛季：在旧地址首页展开「管理本地存档与备份」→「存档备份与导入」→「导出全部存档」；随后在公开网站的相同位置选择「导入存档」。只保存已完成的比赛；比赛中途刷新会丢失这一场的进度。更新版本前建议再次导出备份。

## 下一轮开发原则

先保持可玩、可验证的比赛体验，再扩玩法。下一轮优先检查门将与其他球员的视觉风格一致性、扑救和射门碰撞反馈、SIU 连续帧、实际比赛难度；然后再拓展生涯传奇感、赛季数据可视化和俱乐部经营。不要在本轮上线时顺手加入未约定的新系统。

开发遵循用户提供的 AGENTS 原则：先说清假设和取舍；用最少代码解决问题；只改与目标相关的文件；定义可验证结果并完成检查。保留已有未提交改动，不随意重置工作区。

## 在新对话中接手

在同一个 Codex 项目下新建对话，先指定上述项目目录，发送：

> 请先阅读 `PROJECT_HANDOFF.md`、检查 Git 状态和线上 GitHub Pages 版本。不要重做已完成功能。我们继续开发像素绿茵；每次先说明本轮目标与验证方式，修改后运行测试并在实际比赛中检查。先告诉我你确认的当前状态，再按我的下一条需求开始。

若新对话运行在不同电脑或工作区，先克隆上述 GitHub 仓库；本机未上传的素材、截图和旧站点 `localStorage` 不会自动随 GitHub 仓库迁移。

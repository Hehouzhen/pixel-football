# 像素绿茵：上线与后续开发交接

更新日期：2026-10-08。此文档供同一 Codex 项目中的新对话直接接手使用。线上状态和 Git 提交可能晚于本地工作区；每次开始前核对 Git 状态和存档版本，不要把过往计划当成已实现功能。

## 2026-10-08 本地审查状态

- 完整赛季闭环已核验：五大联赛 1,200 场（管理联赛 240、其余联赛 960），欧冠 53 场；比分与逐场球员进球、跨赛事生涯出场/进球账本相符，赛季奖项、球员荣誉和完成后存档可往返读取。
- 新增赛季总结卡和独立赛季开幕页：展示上季排名、战绩、冠亚军、MyCareer 赛季表现；休赛期页展示年龄与能力变化、转会和退役。新赛季开幕状态写入存档，重载后可以继续确认，再进入第 1 轮。
- 真实完整赛季存档 JSON 约 6.2 MB，已改用 LZ 压缩写入本地存储，测试压缩后约 0.93 MB；仍兼容旧的未压缩存档。两份完整赛季组成的约 12.5 MB JSON 备份可以导入，备份大小上限提高至 64 MiB。
- `npm test` 运行 Node 逻辑/赛季闭环测试和 7 项 Playwright Chromium 页面测试。浏览器使用隔离上下文，覆盖俱乐部创建、模拟推进和刷新恢复、主要数据页、赛后新闻、联赛/欧冠颁奖、6 MB 完整赛季压缩存档载入、MyCareer 创建恢复、两种模式跨赛季流程与开幕状态恢复、390px 小屏和错误兜底。CI 在测试前安装 Chromium。
- 本地 GitHub 推送曾因网络连接超时失败；当前本地提交与 `github/main` 的差异需要在网络可用时复核。只推送到公开 `github` 远端，切勿推送到内部 `origin`。
- 新增页面级错误兜底：React 渲染异常显示恢复提示，而不是留下空白页面。它无法捕获事件回调中的所有异常；继续检查浏览器控制台。
- 网页存档按来源地址隔离。不同端口、GitHub Pages 和其他域名的存档不会自动同步；旧版存档导入新版本前先导出备份。

## 项目位置与发布

- 项目根目录：本文件所在的 `pixel-football/` 文件夹；在 Codex 中选择包含本文件的项目。
- GitHub 仓库：`https://github.com/Hehouzhen/pixel-football`
- GitHub Pages 公开地址：`https://hehouzhen.github.io/pixel-football/`。2026-10-05 已确认首页和主要脚本、样式返回 HTTP 200；首发工作流 `https://github.com/Hehouzhen/pixel-football/actions/runs/37300776842` 成功，游戏版本提交为 `19f59d9`。
- 本地预览：在项目目录运行 `node preview.mjs 4174`，打开 `http://127.0.0.1:4174/`。本地服务需要保持运行；关机或进程结束后要重启。
- 发布流程：推送 `main` 后，`.github/workflows/pages.yml` 在 GitHub Actions 执行 `npm ci`、`npm test`、`npm run build`，再发布 `dist/`。仓库 Settings → Pages 的 Source 必须是 **GitHub Actions**。
- 本项目以前也关联过 Sites，配置保留在 `.openai/hosting.json`；目前公开上线目标改为 GitHub Pages，不要误推送到内部 Sites 远端 `origin`。

## 当前游戏范围（本地代码审查确认）

- 6 对 6 像素足球。WASD 移动，Shift 冲刺，鼠标左键瞄准/射门，右键或空格传球/呼叫要球，F 或滚轮下传中，E 抢断，Q 防守切人，Esc/P 暂停。
- 快速比赛、训练场、俱乐部联赛和 MyCareer；联赛可亲自比赛或模拟。五个联赛各 16 队。MyCareer 控制自建球员，支持成长、退役、荣誉与转会邀请。
- 赛季数据包括球队积分与财务、球员跨赛事统计、赛后新闻、奖项、历史记录、年龄变化、退休和有限转会市场。比赛及模拟赛果保存在本地存档。
- 欧洲冠军杯新格式为 20 队、4 组小组赛和淘汰赛；旧存档保留旧杯赛格式兼容路径。参赛资格和赛事阶段受赛季进度控制。
- 总控制菜单包括游戏设置、历史排名、存档导入/导出和世界数据库/God Mode。动态球员世界覆盖 80 支球队；God Mode 可编辑球员及球队数据。
- 转会市场目前仍是有限模拟：球队市场按窗口限额交易，动态世界交易按联赛独立处理；不是完整跨联赛市场，也没有租借及完整合同谈判。
- 当前为浏览器单机游戏：无账号、联机对战或云端存档，也没有正式 11 人制。浏览器本地存档受源地址隔离。
- 页面错误兜底已加在 React 根节点，显示重载提示；它不能代替浏览器测试，也不捕获所有异步或事件处理异常。

## 代码地图与验证

- `src.jsx`：React 入口、页面和比赛流程；`ui.jsx`、`career-role.jsx`、`experience.jsx` 等拆分页面组件。
- `engine.mjs`：比赛物理、AI、判罚及统计；`tactics.mjs`：战术决策；`field.mjs`：球场尺寸。
- `pitch.mjs`：比赛 Canvas 绘制；`player-sprite.mjs`、`keeper-sprite.mjs`、`keeper-motion.mjs`、`celebration.mjs`：像素球员及动作。
- `league.mjs`、`clubs.mjs`、`cup.mjs`：联赛、球队和杯赛；`career.mjs`、`career-story.mjs`：个人生涯。
- `replay.mjs`、`replay.jsx`：进球回放；`practice.mjs`、`practice.jsx`：训练场。
- `save-slots.mjs`：三个压缩本地存档槽与 JSON 备份，读取时兼容旧版明文存档，存储键 `pixel-pitch-saves-v2`。
- `season-loop.test.mjs`：五大联赛完整赛季、欧冠、球员账本、赛季奖项和存档往返测试。
- `build.mjs` 将 `src.jsx` 打包为 `dist/app.js`；`dist/index.html` 使用相对路径加载脚本和样式，适配 GitHub Pages 项目子路径。
- `playwright.config.mjs` 使用临时本地预览服务运行 `browser-tests/`；测试浏览器上下文隔离，不读取常用 Edge/Codex 浏览器配置或存档。
- 修改后至少运行 `npm test` 和 `npm run build`；`npm test` 同时运行 Node 逻辑测试与 Playwright Chromium 页面测试。新环境首次运行需执行 `npx playwright install chromium`。涉及交互或动画时再打开实际比赛画面检查。不要只凭构建成功判断玩法正确。

## 存档迁移与版本注意事项

本地预览和 GitHub Pages 是不同网站地址，浏览器不会自动共享 `localStorage`。用户若要继续本机赛季：在旧地址首页展开「管理本地存档与备份」→「存档备份与导入」→「导出全部存档」；随后在公开网站的相同位置选择「导入存档」。只保存已完成的比赛；比赛中途刷新会丢失这一场的进度。更新版本前建议再次导出备份。

## 下一轮开发原则

先保持可玩、可验证的比赛体验，再扩玩法。下一轮优先检查门将与其他球员的视觉风格一致性、扑救和射门碰撞反馈、SIU 连续帧、实际比赛难度；然后再拓展生涯传奇感、赛季数据可视化和俱乐部经营。不要在本轮上线时顺手加入未约定的新系统。

开发遵循用户提供的 AGENTS 原则：先说清假设和取舍；用最少代码解决问题；只改与目标相关的文件；定义可验证结果并完成检查。保留已有未提交改动，不随意重置工作区。

## 在新对话中接手

在同一个 Codex 项目下新建对话，先指定上述项目目录，发送：

> 请先阅读 `PROJECT_HANDOFF.md`、检查 Git 状态和线上 GitHub Pages 版本。不要重做已完成功能。我们继续开发像素绿茵；每次先说明本轮目标与验证方式，修改后运行测试并在实际比赛中检查。先告诉我你确认的当前状态，再按我的下一条需求开始。

若新对话运行在不同电脑或工作区，先克隆上述 GitHub 仓库；本机未上传的素材、截图和旧站点 `localStorage` 不会自动随 GitHub 仓库迁移。

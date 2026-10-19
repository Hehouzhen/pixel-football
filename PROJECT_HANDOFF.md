# 像素绿茵：上线与后续开发交接

## 当前交接基线（2026-10-19，Codex / DeepSeek 共用）

**本次发布授权：用户已明确要求按当前本机版本提交至GitHub并部署公开网页。** 执行范围及边界见RELEASE_20261019.md；下方旧任务的“未授权发布/未提交”是当时状态。本次不处理个人存档恢复，不把G1—G6计划标为已实现，发布结果由实际Actions与公开页面验证。

**最新继续复审：R14已通过专项范围，R15/R16仍各缺一处，G1—G6未开始。** 见CODEX_R14_R16_FOLLOWUP_REVIEW_20261019.md：33项及浏览器2项由Codex本轮独立通过，仍需补实战/国家队完整事实比较和v1/32位收据兼容。此前复审结论保留作历史，不代表此刻所有旧问题仍未修复。未修改游戏实现/真实存档或发布。

**最新复审补充：MATCH-LEDGER-01尚未通过核心验收。** 详见CODEX_MATCH_LEDGER_REVIEW_20261019.md，下一轮先修R7—R13；下方DeepSeek的实现/测试记录保留为其交付证据，不覆盖本次独立反例。Codex本轮74项相关检查通过，另复现渲染20/24失败；未运行全库/浏览器或发布，未修改游戏实现或真实存档。

**先读本节。下方按日期保留的旧记录不是当前功能开关表；其中“国家队尚未接入”等描述已被后续本机实现替代。**

### 文档入口与代码版本

- 接手入口：`DEEPSEEK_START_HERE.md`；开发规则：`AGENTS.md`；长期要求：`PRODUCT_REQUIREMENTS.md`；任务状态：`TASKS.md`；关键取舍：`DECISIONS.md`。
- 实际代码根目录：`C:\Users\何厚臻\Documents\Codex\2026-09-29\sites-plugin-sites-openai-curated-remote\pixel-football`。聊天的 `2026-10-14\wo` 目录不是本次正式代码根目录。
- 本轮已核验分支 `main`，HEAD `2d54b7aa2f915e6c1b3968a18d13212618963d22`（Release gameplay, career, tactics, and Dream Squad updates）。**存在大量已修改与未跟踪源码、测试及资源；该提交不能代表当前全部本机版本。** 不执行 reset/clean 或覆盖未提交内容。
- 最近工作为 MATCH-LEDGER-01（统一结算与可追溯履历）及 ID-03 阶段0 R5/R6 修复，已专项验证并构建；未提交、推送、部署、修改用户存档或重跑完整 Playwright。线上实际状态本轮未核验。
- 日常本机入口 `http://127.0.0.1:4177/`；自动浏览器测试由配置启动 `4199`。当前服务是否运行需接手者确认。`dist` 包含直接维护的 CSS/HTML/图片，不应整体删除。

### 当前实现地图

| 领域 | 当前代码入口 | 状态与边界 |
|---|---|---|
| 页面与流程 | src.jsx、ui.jsx、career-journey.jsx、dist/*.css | 新旧生涯界面并存；职业 journey 仍保留 journey 字段 |
| 实操比赛与像素动作 | engine.mjs、pitch.mjs、player-motion.mjs、rear-sprite.mjs、player-sprite.mjs | Match 动作引擎；视觉/手感仍需用户验收 |
| 俱乐部模拟 | simulation.mjs、long-simulation.mjs、league.mjs、cup.mjs | EventMatch 事件引擎；不等同于 Match |
| MyCareer | career.mjs、career-journey.mjs、src.jsx | 青训、合同、职业机会、跨季、发展；顶部职业长期模拟已接线 |
| 国家队 | national-team.mjs、international-career.mjs、national-progression.mjs、national-countries.mjs | 已有征召、比赛、赛事、归队与故事实现；规则适配见 NATIONAL_CAREER_IMPLEMENTATION.md |
| 世界身份 | identity.mjs、world-player-identity.mjs、player-registry.mjs、player-names.mjs | 已有稳定 ID 与部分统一读取；整体工程未完成 |
| 保存 | save-slots.mjs、history.mjs | 已使用 IndexedDB 和独立赛季归档，也有回退；不能再假定仅 localStorage |
| 只读诊断 | identity-audit.mjs、audit-identity.mjs、test-fixtures/identity-worlds.mjs | 有诊断与固定生成样本，仍有失败回归待处理 |
| Dream Squad | dream-team.mjs、dream-player-catalog.mjs 及相关签约/货币模块 | 现有抽卡、卡牌与收藏系统；此次未修改或重新验收 |

### 最近完成的本机工作与证据

- CAREER-04：新增 career-market.mjs / career-future.jsx，职业赛季结束后可从“休赛期 · 我的未来”进入独立页面，三步完成意愿、球探接触和正式报价；支持主动申请、私下寻找、留队、租借、三支心仪球队、偏好选择、一次待遇沟通及撤回历史。表现、样本、位置竞争与适配影响关注，资金/工资/名额限制正式报价。快照保存、刷新稳定、新季隔离、JSON校验和实际转会合同/双方账目均接通。规则和限制见 CAREER_TRANSFER_MARKET.md。
- 验证：转会市场7项、职业旅程15项、升级7项专项通过；旧邀请兼容脚本通过；浏览器2项走通新旧生涯、豪门报价、刷新、手机和真实跨季成交；构建通过。优异表现不是豪门必签，预算不足会明确显示。既有身份工程阻塞仍保留，不声称全库通过。

- CAREER-03（2026-10-19）：职业排阵和竞争评估复用 squadPlayers，合并首发与注册名单、按 ID 去重，过滤缺失人物、其他球队、自由及退役球员。同位置替代者不足时主角改首发，机会说明同步显示原因；排阵成功前不写入部分首发或改变安排。确实缺人时提示门将/后卫/中场/前锋具体缺口。未增加位置兼任、生成新球员或批量修存档。
- 本轮实际验证：career-journey.test.mjs 15/15（新增唯一前锋、名单不同步及缺门将三个回归；唯一前锋样本同时跑实际长期模拟，验证身份、外观、单次出场和旅程累计）；长期模拟入口浏览器专项1/1；npm run build通过。最终机会说明调整后重新运行15项专项和构建；未重跑全库或用用户真实存档验证。

- MyCareer 顶部新增 sticky“长期模拟”入口；职业阶段和旧生涯可用，青训阶段提示签约后开放。修复专业旅程仍有 journey 字段导致详细模拟面板隐藏的问题。
- 长期模拟接入旅程首发/替补安排与 finishJourneyMatch，不再让新人一直无出场且 clubGames 不增长；修复未出场、lastMatch 为空时新闻生成报错。顶部目标为本赛季，自动安排阵容，普通队友诉求不打断；国家队窗口、颁奖、赛季边界仍停下。可手动停止，逐场保存。
- 联赛完结且无下一场玩家欧冠时，后台结算其他球队剩余杯赛；仍有玩家杯赛时保留其比赛。打开旧的已完联赛存档时补处理，恢复进入休赛期的按钮。
- **上一轮实际通过**：`npm run build`；`node --test career-journey.test.mjs career-upgrade.test.mjs`（19/19）；两个专项浏览器用例“顶部长期模拟入口逐场保存并可停止”和“无欧冠资格…旧档也能补结算”分别通过。
- 浏览器第二项验证范围为旧档补结算、完成颁奖、打开“选择下一段旅程”后出现“留队并进入休赛期”。未在该新增用例内继续点击生成新赛季。用户真实存档、所有国家和长时间连续多赛季未在这轮重新验收。
- 这些证据来自上一轮工具执行；本轮仅核对文档和代码入口，未重新运行上述测试。历史全套通过记录不表示当前全库通过。

### 当前首要未完成事项

- **统一身份基础阶段未完成验收**：PLAYER_IDENTITY_FOUNDATION.md 中列出入口、权威来源、操作契约和只读检查器；不代表已完成数据库迁移或全系统单一来源。
- **ID-02 收尾通过，待 Codex 复审**：第一轮修复受益队/`ownGoal`；第二轮补齐 R1（头球/倒钩/对方来球/换人来源）与 R2（缺 `teamIds` 的兼容报告）；第三轮补齐 R3（换人后传中完成统计归原人）与 R4（国家队履历报告复用导入校验）。种子 17、36 保留。该状态不等于全库通过，也未提交或发布。
- 阶段 A 的入口清单与权威来源表继续有效；当前身份/事件/资料专项以本轮实际运行的 199 项 Node 专项、`test.mjs`、整季回归和新增浏览器链为准，不再引用旧“13 项中 11 通过”记录。
- ID-02 剩余风险：AI 在危险状态下仍会选择贴近本方球门线的身后出球点，120 场固定样本出现 4 次回传乌龙（3.3%）。本轮按“不改比赛概率”未改出球决策，建议单列 ID-04；动态进球回放的播放/镜头/暂停未验收；完整 Playwright 套件、全库回归和真实用户存档体验仍未验证。
- **ID-03 第一阶段已在本机实现并完成 R5/R6 修复，待 Codex 复审**：姓名/外观/能力以主档为权威，个性化与 God Mode 走统一写入口，训练/比赛/跨季成长走显式提交；旧副本不能再在普通 prepare/open/save 时反向覆盖。个性化号码冲突由专用业务命令先校验再原子改号，页面显示真实结果；门将综合分项先规范化再校验。跨标签页冲突与物理存储尚未开始。
- **MATCH-LEDGER-01 P0 R7–R16 已整改待复审，G1–G6 未开始**：R7 固定赛前身份、R8 完整结算事实、R9 整轮提交与保存失败重试、R10 历史收据、R11 导入校验、R12 履历逐字段、R13 真实职业上下文、R14 统一推进保护、R15 事件/bicycles 比较、R16 旧 8 位收据兼容。14 项结算、7 项履历、13 项资料专项，test.mjs、整季、构建及 4 项浏览器通过；`appearance-studio-render` 20/24 仍失败且精灵文件在本轮前已有未提交修改，单列待查。完整 Playwright、真实存档、多标签并发和五季性能仍未验证；未提交/发布。详见 MATCH_LEDGER.md。
- 当前没有失败的本轮专项；但完整 Playwright 套件和全库/真实存档 QA 未跑，因此不能声称当前 `npm test` 全通过或直接发布。所有待办和负责人以 TASKS.md 为准。

### 每轮交接

先检查 git status 和本节版本，领取一个明确任务。完成后记录修改范围、实际验证、失败与下一步；在本节更新当前状态，旧日志保留。提交/推送/发布需明确任务授权；当前不会因增加协作助手而自动发生。

更新日期：2026-10-19。此文档供同一 Codex 项目中的新对话直接接手使用。线上状态和 Git 提交可能晚于本地工作区；每次开始前核对 Git 状态和存档版本，不要把过往计划当成已实现功能。


## 2026-10-19 ID-02 进球受益队与乌龙球归属（第一轮原始记录；R1/R2 补充见下方）

- 阶段 A 复核：当前 `node --test identity-audit.test.mjs player-matching.test.mjs world-player-identity.test.mjs` 为 28/28 通过；文档中“13 项中 11 项通过”的旧记录不再代表当前代码。失败只保留为可复现的 ID-02 语义问题，不是审计器随机失败。
- ID-02 复现：固定 xorshift 种子 17、36 可稳定出现中国队后卫在自家门前的回传直接进入本方球门；旧事件记 `team=0`（动作方）而比分归黎巴嫩（受益队 1）。120 场固定种子样本中 4 场出现同类回传乌龙。
- 根因：`engine.mjs:goal()` 用 `eventRecord` 的动作方球队写 `team`，动作方与受益队共用一个字段，且没有乌龙球标记。比赛比分、个人统计、事件三者因此无法用同一语义对账。
- 修复：进球事件改为 `team=受益队索引`、`playerId=最后触球者`，乌龙球带 `ownGoal:true`；个人进球只记给受益队球员，乌龙球不记动作者进球，也不触发其庆祝。`result-info.mjs` 透出 `ownGoal`；赛后总结、结果详情、杯赛列表和新闻加“乌龙球”标注；`save-slots.mjs` 的球员进球/比分校验允许显式乌龙球。正常进球数值、主客场顺序和比赛概率未改。
- 验证：新增 `event-attribution.test.mjs` 4项（正常进球、乌龙球、种子17国家队全链、实战俱乐部存档往返）通过；整套 Node 专项 164/164 通过（含身份、国家队、职业旅程、升级、结果展示、新闻、事件模拟、战术、外观）；`node season-loop.test.mjs` 全季对账通过；`npm run build` 通过，`dist/app.js` 含新语义；`http://127.0.0.1:4177/` 返回 200。**`node test.mjs` 当时在第 101 行失败**（旧 `names` 缓存断言与身份表优先冲突）；该问题已在下方第二轮修正并通过，以上保留为第一轮原始记录。Playwright 当时未跑；未在浏览器里实际看到乌龙球画面，未读取或改写用户真实存档。
- 遗留：本方回传乌龙的 AI 出球选择仍会产生（4/120），本轮按“不改比赛概率”要求未处理；建议单列任务评估“禁区内回传保护”。全量人物数据库迁移、主角镜像收敛、统一结算防重仍未开始。


## 2026-10-19 ID-02 补充验收 R1/R2（本地，未提交）

- 依据：Codex 审查 `DEEPSEEK_REVIEW_20261019.md`。R1 已复现：3号传中、5号头球，事件ID仍是传中者、姓名却是5号、个人进球记5号。根因：`aerial()` 更新 `ball.source`/`lastStriker` 但未同步 `ball.sourcePlayerId`，`goal()` 优先采用旧的 `sourcePlayerId`。修复：空中触球写回动作人ID，保留换人前出球由原人承担助攻/传球来源。
- R2 已复现：缺少 `report.teamIds` 的乌龙报告，`resultGoalEvents` 先取动作方参赛行球队，导致受益队错成动作方。修复：显式 `ownGoal` 优先按 `report.teams[side]` 与当场双方标签匹配；标签缺失或无法确认时保留未知，不再退回动作方或当前俱乐部。正常进球仍沿用原回退。
- 导入语义：`ownGoal` 只接受布尔值；报告有完整 `teamIds`/槽位时，乌龙动作方与受益队必须不同；结果级 `goalEvents` 有参赛行时同样校验。乌龙不能同时计入普通个人进球；点球大战仍只走 `shotOutcome`，不写比分、进球事件或个人进球。
- 展示：赛后总结、赛程详情、新闻已标“乌龙球”；比赛复盘的进球高光现在同时显示受益队、号码、乌龙标记和动作人姓名；进球回放元数据保留动作人但不触发其正常庆祝。
- 旧姓名测试：`test.mjs` 改为人物主档姓名优先（`season.names` 保留旧缓存值），并新增“只有缺少主档时缓存才作回退”的独立断言；没有回退生产规则。
- 验证：`event-attribution.test.mjs` 19项通过（含种子17全链、R1 四项、R2 三项、导入六项、点球大战、回放元数据）；整套 Node 专项 183/183；`node test.mjs` 通过；`node season-loop.test.mjs` 通过；`npm run build` 通过；`browser-tests/own-goal-id02.spec.mjs` 1/1 通过，截图 `test-results/own-goal-desktop.png`。未跑完整 Playwright 套件，未用真实用户存档，未提交/推送/部署。
- 残余：R1 修复只影响空中触球后的动作人字段，不改射门概率；R2 对完全无证据的历史报告保留未知，UI 不会把该进球归到任一方。ID-04 回传AI、ID-03 双写收敛、全量迁移仍未开始。


## 2026-10-19 ID-02 第三轮 R3/R4（本地，未提交）

- R3 根因：`engine.mjs:aerial()` 的完成传中分支写 `this.stats[b.source]`（槽位）。换人后该槽位已指向新上场者，导致下场者的完成传球/完成传中/向前传球记到替补，而助攻与关键传球因走 `statLine` 仍归旧人。修复：完成传中三字段改用 `statLine(b.source,b.sourcePlayerId)`；头球者的新 `sourcePlayerId` 仍在旧传中统计之后写入。测试同时核对旧人的传球/传中尝试与成功、向前传球、关键传球、助攻，以及替补在未触球时全为0。
- R4 根因：`validNationalCareer` 校验国家队履历外层字段，却没有校验内部 `report`；俱乐部 results 与职业 history 的 `report` 校验无法覆盖国家队。修复：在职业存档校验中复用同一 `report` 结构与事件语义校验，覆盖 `nationalCareer.history[].report`，不把国家队ID当俱乐部ID。新增显式乌龙报告的人物成员、逐球受益侧与 `report.score` 对账；非布尔/同队/非法人物/非法事件类型/错误受益侧/错误比分均拒绝。`report` 缺失或旧缺字段报告仍可导出恢复。
- 验证：`event-attribution.test.mjs` 21/21（新增 R3、R4 反例）；整套 Node 专项 185/185；`node test.mjs` 通过；`node season-loop.test.mjs` 通过；`npm run build` 通过。浏览器 `own-goal-id02.spec.mjs` 1/1 仍为生成数据、静态复盘与刷新恢复；**没有实际播放动态进球回放**（播放、镜头切换、暂停未验收），回放元数据只有单元测试。
- 边界：未改回传AI、比赛概率、评分、抽卡；未迁移、重编号、修复真实存档；未跑完整 Playwright；未提交/推送/部署。


## 2026-10-19 ID-03 第一阶段：当前资料写入口与 MyCareer 兼容（本地，未提交）

- 写入者盘点：个性化 `src.jsx:customizePlayer`（姓名/号码/外观/踢法）；God Mode `god-mode.mjs:editPlayer`（姓名/号码/能力/年龄/潜力/队伍/位置）；训练 `career-journey.mjs:trainJourney`；比赛成长 `finishJourneyMatch`；跨季成长 `aging.mjs:advanceSeasonAges`；建人 `createCareerPlayer` + `prepareSeason`；旧档恢复/普通 prepare/open/save。
- 权威方向：已有主档时，`season.playerData[playerId]` 的姓名、外观、能力、年龄、潜力、训练重点为当前资料权威；`career` 对象是兼容镜像与职业业务数据。普通 `prepareSeason` / `carryIdentity` 不再把过期副本写回主档，而是主档→副本同步；只有新主角首次注册、主档确实缺字段时才由副本补。历史比赛快照、号码/国家队号码、旅程、XP、统计、故事字段不在此入口内。
- 统一写入口：`identity.mjs:updatePlayerProfile(season,playerId,patch,{career})`。按稳定ID定位；只允许资料字段；姓名/号码/外观/能力/年龄/潜力/训练重点先完整校验再原子写入；失败不留下部分修改；成功后镜像到 `career`。个性化与 God Mode 均调用它，God Mode 的队伍/位置/名单交换仍走原逻辑。
- 成长提交：`identity.mjs:commitCareerGrowth(season,career,previous)` 只把本轮相对 `previous` 实际变化的能力字段与训练重点写回主档，不用整份旧副本覆盖主档其他新编辑；`trainJourney`、`finishJourneyMatch`、长期模拟和年度训练重点接入显式提交。赛后 level/XP 等职业字段仍只存在于 career，不伪装成资料字段；跨季 `advanceSeasonAges` 继续以主档为源并镜像。
- 验证：新增 `player-profile-authority.test.mjs` 9项（旧副本反向覆盖、统一入口/同名/原子性、God Mode、训练成长、比赛成长、新主角初始化、跨季、旧档缺字段）；199项 Node 专项、`node test.mjs`、`node season-loop.test.mjs`、`npm run build` 通过。浏览器 `player-profile-authority.spec.mjs` 1/1：主档新资料+旧副本加载 → 个性化改名 → 刷新 → 国家队页 → 返回并进入比赛；职业旅程4项、国家队3项、世界身份1项、外观2项浏览器回归通过。
- 未验证：完整 Playwright 套件、真实用户存档、跨标签页并发冲突、统一结算幂等、物理存储拆分；未做全量统计重算、旧ID重编号、同名人合并、回传AI调整；未提交/推送/部署。


## 2026-10-19 比赛内模拟窗口与国家队方案（本地，未发布）

- `LiveSimulationWindow` 共用现有比赛动作引擎，可在快速赛、俱乐部/MyCareer、青训、Dream Squad 和训练中开启；模拟速度 1/2/4/8 倍、半场/终场推进、暂停与实时比赛画面共用原始结算统计。
- 青训比赛与未签约热身新增“模拟这场比赛”。MyCareer 模拟替补首秀保留实际上场分钟。接管恢复手动控制；模拟中的比赛页切换受阻，避免后台比赛推进后丢失控制。
- 所有正式比赛中场会暂停，并使用模拟窗自身控件继续，防止原暂停层挡住窗口。点球大战模拟模式自动结算；手动模式保留原点球操作。
- `NATIONAL_SELECTION_DESIGN.md` 是完整的国家队入选评估开发规范，涵盖阶段、样本与分钟口径、分项竞争力、六人制名单配额、中国/阿根廷差异、国际窗口、名单锁定、叙事、开发顺序和验收。未接入征召/赛程。
- 本轮新增 3 项模拟单元测试通过，国家队与生涯相关单元也通过。最后一轮 5 项重点浏览器回归全部通过（青训中场/终场与一次性结算、训练模拟、职业替补分钟、联赛事件模拟、欧冠模拟）；之前国家队页面与存档浏览器检查通过。手机模拟窗口已目视检查，像素球场保留原样。未执行完整全库回归，未部署。

## 2026-10-19 国家队初步接入（本地，未发布）

- `national-team.mjs` 提供中国、阿根廷、法国、日本、摩洛哥、新西兰六队的初始游戏画像和分位置竞争参考。参考值不是现实球队评分或正式名单，不参与现有比赛强度、球员潜力或俱乐部属性计算。
- 创建生涯增加“国家”独立步骤，默认中国，可在确认开始前修改；生涯页增加“国家队”导航。没有 journey 的旧生涯使用 `SeasonWorkspace` 的 `nationalPanel` 插槽，不能直接在其 children 外插入第二个根节点。
- 可选身份存为 `player.international={version:1,nationId}`，旧档保留未选择状态，可保存补选；保存成功后再更新界面，失败可重试。存档校验拒绝非法 ID/版本和伪造字段，备份往返保留身份。
- 国家队页面展示最近五场职业比赛、分钟、评分和位置能力形成的竞争评估；青年赛不作为成年国家队证据。俱乐部比赛结算后评估自动读取新记录。尚无正式征召、国家队比赛、赛历、参赛名单与大赛，不应宣称已入选或已产生国家队数据。
- 构建、21 项国家队/生涯/升级专项测试、10 项创建/旧档/失败重试/外观浏览器测试通过；桌面选择页与手机选择/档案画面已查看。没有重跑全赛季回归，未部署公开网页。

## 2026-10-17 转身与出脚衔接（本地，未发布）

- 新增 `player-motion.mjs`：身体朝向按最短角度短暂过渡，绘制方向和移动输入分开；出脚前段保持真实出球方向。玩家实际移动、出球响应和球速未加入等待。
- `release` 记录真实离脚点、出球方向及当时球员位置；地面传射使用独立的支撑腿、触球脚与收腿表现。头球和倒钩继续走原有空中动作。快速出球与高力量射门使用不同触球保持时间。
- 正面各动作帧复用站立基准锚点，减少因最低像素变化引起的整体跳动；回放保留动作数据，并使用最短角度插值，兼容没有新字段的旧帧。
- 构建、49 项相关专项测试、独立回放检查、12 项外观/纪事/比赛控制浏览器检查通过；查看了连续动作图与桌面/手机比赛画面。未重跑本轮全赛季测试，未公开部署。

## 2026-10-17 共用背面人物更新（本地，未发布）

- 新增 `rear-sprite.mjs`：独立像素背面身体、稳定脚底锚点、走路/跑步/动作/庆祝姿态；入场单独使用小步幅走路循环。后脑、后颈、长发/光头/马尾等由 `studio-head.mjs` 的背面分支绘制，正面继续使用原有素材。
- 共用 `drawSprite` 接入背面身体与像素背号。背号跟随躯干，不随水平翻转变成镜像；比赛不再叠加第二份背号。方向使用保持区间减少正背面临界闪切。
- 外观预览、比赛、回放与入场复用同一背面绘制。保留肤色、发色、号码、体型、球衣、长袖、护腕、袜色与球鞋色配置。
- 构建、45 项相关专项测试、11 项外观/纪事/比赛控制浏览器测试通过。查看了动作帧整图与桌面/手机入场截图；没有执行新一轮全赛季测试，也没有公开部署。

## 2026-10-17 像素入场精修（本地，未发布）

- 通道入场由 10 秒缩至 3.2 秒，取消中间停步，持续走向球场；启动兜底 4.2 秒，减少动态效果模式 0.9 秒后开赛。比赛计时在入场中冻结，可随时跳过。
- 保留原生像素人物，增加两队实际球衣配色、号码和外观，补足阶梯看台、灯带、队旗、砖缝、像素地面透视与脚下阴影。脚步声随新节奏调整。
- 签约、颁奖时长未变。时间线专项与纪事/比赛控制浏览器检查通过，包含自动开赛、跳过、减少动态效果；桌面与手机截图已人工查看。

## 2026-10-17 比赛细节升级（本地，未发布）

验证：本轮构建、完整 npm test 通过，含 79 项专项测试、赛季与存档回归、58 项浏览器测试。

- 共用实操引擎的持球偏移改为按时间连续收敛，降低急转、冲刺启停及护球位置变化造成的跳动；未改变像素素材。
- 边路接应侧在当前配合中保持稳定，重新获得球权时清除旧的角色分配与前插目标；成功滑铲保留恢复，恢复中不能再次抢断；队友响应要球前检查停球与恢复状态。
- 来球距离不超过 32、朝接球者运动且为本方低平传球时，可提前按传球，保留 0.12 秒，在接球后执行一次。俱乐部支持原传球者为明确的目标接球者预输入；MyCareer 保持固定身份。保留鼠标落点与直塞意图。
- 预输入超时、其他球员抢到球、手动切人、改按射门、重新开球、暂停或窗口失焦时取消，避免恢复后误出球。操作栏有一脚出球提示。
- 新增操作回归覆盖连续持球、接应侧、滑铲恢复、要球停球、脚下/指向/直塞预输入、超时与取消。自动检查不代替人工手感验收；没有修改玩家存档或公开部署。

## 2026-10-14 Dream Squad 全卡能力画像与模拟校准 v3（本地）

- 修改前快照保存在 `reports/dream-rating-rebaseline-20261014/baseline.json`，包含原有 632 张卡、308 个身份的稳定 ID、游戏评分、稀有度、23 项能力与像素外观；包含改动前源文件 SHA-256。未改卡 ID、球员身份、外观，也固定了原新档的 12 张起始收藏与 6 人首发，避免总评变化让初始名单悄悄换人。
- `dream-rating-model.mjs` 为全部 308 个球员身份提供 8 种细角色和分位置原型；29 名代表球员沿用人工锚定属性，其余 279 人按身份稳定分配门将/中卫/边卫/后腰/中场/前腰/边锋/中锋子风格。每个身份都有能力强弱项，632 个卡版本继承同一身份风格；巅峰/传奇时刻、生涯启程版本沿该风格调整能力。
- 普通球员的总评锚定原始来源值，和新公式相差不超过 1 分；其他未人工锚定身份也保持同一评分锚点。总评归一化只移动角色评分涉及的能力，避免为了凑总评抬高无关能力。历史影响值不参与能力、总评、稀有度或比赛逻辑。
- Dream Squad 的卡面、阵容总评、训练后总评、自选巨星签约和比赛建队都改用同一角色公式。实时 Match 收到真实 23 项能力，能力继续决定速度、持球、传球、争抢、射门和扑救；团队总评继续按现有规则进入阵容强度。
- 代表改分：Laudrup 81→92、Rivaldo 85→94、Hagi 82→93、Rui Costa 80→92、Gilberto Silva 78→93、Carrick 80→88、Cafu 86→91、Roberto Carlos 89→92；Endrick 91→76，潜力不再当当前能力。Zamora 历史档案 91，游戏总评 83，注明跨时代数据估值限制。
- 改后 308 身份、632 卡版、全部卡池大小/抽卡费率与像素身份不变。传奇/精英/黄金/新秀卡数从 134/102/200/196 变为 148/98/218/168；世界球探基础 90+ 率仍为 0.1%，85+ 率为 1.5%。现存保底使长期平均分别为 1.05%/2.39%，没有改保底。
- 新增 40 场固定种子 AI 对 AI 镜像对照，使用相同六人、队伍强度和主客互换：角色化能力组每队每场平均 1.50 球、15.25 次射门、70.68 次传球、52.78 次抢断尝试；把能力全部压成球员总评的对照组分别为 1.43 球、9.60 次射门、45.68 次传球、45.63 次抢断尝试。此结果表明单一总评会抹掉动作差异；它是小样本平衡检查，不是对真人比赛体验的替代。
- `dream-rating-model.test.mjs` 现在检查全部 308 身份/632 卡属性范围、身份版本画像一致、普通球员评级锚点与比赛能力接线；`dream-simulation-calibration.test.mjs` 固定随机种子执行上述对照。完整 `npm test` 与构建待本轮结束后复核。修改仅在本地工作区，未推送 GitHub；真实玩家手感仍需人工游戏体验验收。
- 数据与计算限制、全卡新旧评分/23 项属性和回滚快照见 `reports/dream-rating-rebaseline-20261014/评分模型与首批球员画像.md`、`全部632张卡新评分.csv` 和 `baseline.json`。

## 2026-10-12 多赛季完整性回归（本地）

- 新增 `multi-season-integrity.test.mjs` 并接入 `npm test`。两季交接验证 MyCareer 目标逐季结算、联赛与欧冠结果账本、俱乐部挑战只结算一次并跨季保留、青训与稳定球员 ID、年龄增长、休赛期重复进入不重复处理、历史排名和完整存档往返。
- 该测试用受控的 0:0 联赛赛果验证跨季/归档边界；实际比赛事件、五联赛比分与球员进球守恒仍由 `season-loop.test.mjs` 的完整 240 场本联赛、960 场其他联赛和 53 场欧冠模拟验证。
- 未发现需要修改产品逻辑的回归；联赛 16 队/30 轮与欧冠 20 队/53 场保持不变。完整 `npm test`（22 项浏览器用例）、构建和差异格式检查通过。当前工作区仍有本地未提交改动，未推送 GitHub。

## 2026-10-12 日期、恢复、轮换与长期模拟（本地）

- `schedule.mjs` 为 30 轮联赛安排周末日期，欧冠安排周中/决赛周末，冬季保留休息间隔。`calendar.mjs` 的统一下一步包含日期。新增和打开的 UI 存档启用 `calendar.dated`；既有历史比赛保持原记录。
- `recovery.mjs` 按实际出场比例、跑动、压迫风格和体能记录跨场负荷；休息天数降低疲劳。长时体能能力、当场体力和身体恢复分别计算。实战/事件模拟共用初始恢复状态；实战体力恢复不超过该场恢复上限。未出场不增加负荷，同一比赛不重复记账。
- 新增“赛程与长期模拟”板块，提供未来 1/5/10 场、冬窗、联赛结束、本赛季结束。异步逐场推进、逐场保存、可停止；颁奖/赛季边界必停，可选择遇到新诉求/负资金暂停。提供教练自动轮换/换人；MyCareer 可以由教练安排休息，零分钟不计出场/XP，亲自比赛会确保控制本人。
- 未来五个已确定对阵可保存逐场六人首发计划，或采用恢复建议；计划有效时覆盖自动首发选择。替补/球员转会后无效计划忽略。MyCareer 不手动编辑队友阵容。每场仍保存新闻、个人统计、比分与对应进球事件。
- `long-simulation.mjs` 复用现有事件引擎和联赛/欧冠/生涯结算。`cup.mjs` 在有日期的存档中只推进已到比赛日期的轮空或出局后后台欧冠，避免提前完成未来比赛并污染疲劳。非日期模式的测试/旧流程保留原推进方式。
- 2/5 分钟模拟时长元数据已正确进入联赛/杯赛记录；跨场负荷按足球分钟比例归一，避免游戏时长改变身体负荷。轮换计划与恢复状态有备份输入验证。
- 已验证日期、疲劳恢复、重复结算、轮换、5 场长期模拟、停止/刷新/计划恢复，以及按日期走完 240 场本联赛与 53 场欧冠。完整 `npm test`（21 项浏览器用例）通过；最后补查欧冠入口和长期模拟 2 项浏览器用例以及客场/两回合总比分平局点球记账通过。长期推进停在当前赛季，不自动选择转会、续约、跨年去向或跳过颁奖；刷新后停在最近已保存比赛，不自动恢复运行任务。尚未推送 GitHub。

## 2026-10-12 年度成长与名单更新修正（本地）

- 原版本已有全世界年龄/退役结算，问题是自然成长很弱而 MyCareer 升级不断发放即时能力点。现在比赛 XP/等级只记录经历，不新增训练点；已有能力、荣誉、旧训练点记录保留，不回滚历史。
- `aging.mjs` 统一年度成长：年轻球员按年龄、位置、潜力和出场量发展，训练重点每年最多增加对应能力 2 点；成熟期放缓，30 岁后身体衰退、36 岁后增加技术衰退。同一年不重复结算；跳过年份按年度补进年龄。MyCareer 同步共享身份的年龄与能力，保存年度报告。
- MyCareer 原“训练分配”改为“年度训练与发展”，选择下次休赛期训练重点；年度报告展示年龄、位置综合与具体能力变化，赛季开幕页也展示。不再允许比赛期间消耗训练点立即加能力。
- `world.mjs` 休赛期给一线队未满 12 人的球队提拔一名 17–19 岁新人；新人能力低于成熟首发，保留成长潜力。电脑球队按同位置能力重新选首发，玩家球队由玩家决定。原 2–4 年 AI 转会规则、退役补位及稳定球员 ID 保留；高龄自由球员也会退役并从活跃自由球员池移除，历史身份与荣誉保留。青训提拔记录进入休赛期动态与存档。
- `career-development.test.mjs` 验证刷 100 场比赛不涨能力、年度成长/衰退/退役、训练重点上限、80 队青训提拔、幂等与备份往返。已有成长、世界与球队生活测试通过；浏览器验证实际休赛期推进后年龄变 19 岁，刷新不重复增长，并保留训练重点与报告。

## 2026-10-12 像素球员外观工作室（本地）

- `appearance.mjs` 定义 12 种发型、挑染、4 种胡须、发带、左右/双侧护腕、袜长、独立颜色和 3 种体型轮廓；仅改变视觉，不改变碰撞、能力或模拟结果。保留现有像素人来源和动作。
- 创建 MyCareer 和“我的球员 → 个性化”共用分组编辑器，支持颜色选择、随机搭配、正背面预览与显式保存。旧外观字段和已有 6 种发型编号保持兼容。
- `player-sprite.mjs` 共用预览与实战绘制，头部附加细节跟随源帧头部范围，护腕/袜子/球鞋使用源像素区域；缓存上限保持 384。外观同步到稳定球员身份，转会/换季和导出导入保留。
- 外观验证、旧存档兼容、导出导入、12 种发型不同画面、24 个动作帧与球场绘制以及 2 项 MyCareer 浏览器用例通过；已检查桌面和手机布局。`appearance-render.test.mjs` 为独立视觉检查脚本。本地仍为 4177，尚未推送 GitHub。

## 2026-10-12 球员能力与事件模拟 v3（本地）

- `ratings.mjs` 定义 23 项正式能力和位置评分；旧字段兼容。球员档案、训练、God Mode 分组编辑、市场评价和实战能力读取已经接入。God Mode 可切换核心/分类/全部能力列。
- `simulation.mjs` 的 `EventMatch` 按区域和事件计算控球、传球、接球、突破、犯规、牌罚、射门、争顶及扑救。体力、战术、天气、比分和剩余时间进入对应环节；正式快速模拟不再先定比分再分配个人数据。电脑球队会按疲劳、位置和替补能力评估换人，玩家球队保持手动控制。
- 俱乐部、MyCareer、欧冠的模拟按钮进入 `simulation.jsx`。支持暂停、单步、重要事件、速度、中场/终场快进、临场换人和战术调整。中场暂停，终场接入现有保存、新闻和颁奖。欧冠点球大战读取在场球员能力并记录主罚播报，不计入常规进球。
- 每场允许替补逐人记录，首发仍为双方各六人；零分钟的新版模拟记录不增加出场或 MyCareer XP。门将个人失球按在场期间计算，零封至少 60 分钟。新指标未被旧比赛记录时保持缺失，平均值只使用有对应事件数据的出场。
- 事件日志无损紧凑存储；存档、历史档案和导出备份加载时展开。`simulationVersion: 3` 标识新比赛。旧赛果与稳定 ID 保留。区域示意不生成实战射门图或逐帧热区；进行中模拟暂不支持刷新续播。
- 构建、完整 `npm test`（含 18 项浏览器用例）通过；额外验证旧 `goalkeeping` 编辑调用会映射到四项门将能力。整季包含 240 场本联赛、960 场其他联赛和 53 场欧冠，压缩保存约 267 万字符并可恢复。详细设计与验证见 `SIMULATION_V3.md`。
- 本地预览 `http://127.0.0.1:4177/` 已核对实际脚本与当前构建一致。此版本尚未推送 GitHub。

## 2026-10-12 联赛 / 欧冠交错赛历（本地）

- 新增 `calendar.mjs`。六人制俱乐部与 MyCareer 现在从统一赛历取下一场；保持每队 30 场联赛，欧冠阶段在联赛轮次间交错，决赛安排在联赛结束后。欧冠可在组间轮空时推进/模拟对应整轮，由既有杯赛结算逻辑补齐其余球队比赛。
- 新一季欧冠参赛资格使用前一赛季五大联赛前四名，首个新档按球队实力播种参赛队；前季排名保存在当前赛季 `previousLeagueStandings`。旧存档打开时按球队实力补建尚未初始化的杯赛，已存在的杯赛与赛果不重置。
- 总览推进栏、俱乐部总览、MyCareer 主赛卡、欧冠页面、赛前画面、实战与模拟入口均读取统一下一场；欧冠尚未排到时不允许越过日历提前进行。休赛期颁奖顺序仍是联赛奖项先、欧冠奖项在杯赛完成后。
- `node build.mjs` 构建通过。本轮未运行测试；赛历边界（首赛季资格、旧存档迁移、欧冠阶段插入及末轮颁奖顺序）需在后续交互验证中重点确认。
- 跨比赛体能与轮换效果未在本轮实现。

## 2026-10-11 Football Lives 基础版本（本地）

### 2026-10-12 交互审查与修正

- 同日欧冠入口调整：俱乐部与 MyCareer 总览增加共享欧冠比赛中心卡片，分别显示资格待定、下一场、未入围和征程结束。欧冠中心统一读取 `cupNextMatch`，移除重复计算；中心页面不显示联赛推进按钮。所有欧冠实战入口经过带比赛类型的赛前准备，开球按 `competition` 分发，修复推进栏欧冠准备后错误进入联赛的路径。赛前对手、天气、两回合规则提示同步；旧杯赛面板显示本队所属小组。
- 欧冠实战、模拟、资格待定入口与小屏适配新增浏览器验证；目前 16 项浏览器检查通过。此轮仅完成入口闭环，真实交错日历、跨场恢复与轮换仍为后续开发内容。

- 续约改为在现有合同到期日（至少本赛季结束的夏季）上延长选定年数，界面明确显示“延长年限”和新的到期年份。增加老将续约后下一夏季不自由离队的回归验证。
- 出场诉求按联赛与欧冠合计的最近六场判断；同位置组调整首发后仍能进行交换谈判。
- 每笔求购报价有独立还价输入，负数禁用提交；收件箱数量包含现金与交换报价。
- 球员展示、档案和赛后表现补齐停球、体能、争顶名称。
- Node 逻辑及完整赛季检查通过（1200 场世界联赛、53 场欧冠）；15 项浏览器测试通过，包含报价输入隔离、续约年份预览和读档；构建通过，4177 的资源与当前构建一致。
- 仍需后续设计：跨比赛恢复与轮换价值、联赛与欧冠交错日历、角色调整协商、续约频率与总合同期限限制、AI 球队的主动合同和阵容经营。上述均不能视作本轮已完成。

- 新增 `football-life.mjs` / `football-life.jsx`。80 支球队初始化为十人一线队（800 名在队球员）；`squadIds` 存完整名单，`rosterIds` 始终存六个首发槽位。旧存档首次加载补齐四名替补，后续读取不会重复生成。球队与战术页支持赛前同位置组首发选择；本轮没有比赛中途替补出场功能。
- 球员有合同到期年份、工资、阵容定位、职业诉求和关系状态。合同在下一赛季夏季结算；老将最多签一年，其他球员最多三年。未续约的管理球队球员会自由离队，优先由已有同位置替补补位，缺少覆盖时提拔青训。AI 球队到期合同采用简化自动续约，MyCareer 自建球员在保留原 2–4 年邀请规则的情况下保护续留。
- 球员提出续约或出场诉求，同时最多三项。承诺未来六场至少三次首发，依据实际联赛与欧冠逐场名单核验；第三次首发立即兑现，六场不足或赛季结束则记录未兑现。关系影响续约工资要求，不修改比赛能力或操作。MyCareer 可查看本队合同并协商自己的续约。
- 保留原交换谈判，增加现金购买、现金求购及还价，检查六人位置覆盖、十二人一线队上限、转会资金、年薪预算和球员意向。现金新援加入一线队后由玩家安排首发。年薪预算与世界市场均计入替补。AI 世界休赛期交易仍采用原来按联赛独立、每隔 2–4 年开启的简化交换机制。
- 联赛经营收入与年度工资按联赛轮次结算，欧冠不额外重复扣年度工资；按唯一比赛 ID 去重。原新赛季固定补发 €12m 已取消，联赛冠军奖金保留。续约、诉求、承诺与转会写入 `lifeEvents` / 球员 `lifeHistory`，赛季档案保留本季经历和收支。
- 新增 `football-life.test.mjs`，覆盖首发数据归属、合同、承诺、现金谈判、到期、God Mode、备份验证及连续三季推进；浏览器增加首发/续约/模拟恢复与现金购买流程，并检查 MyCareer 续约。本轮 Node 逻辑测试、完整联赛/欧冠账本、连续三季推进、14 项浏览器测试及构建已通过；检查了桌面/小屏截图，本地 4177 返回当前构建。
- 下一阶段仍需实现俱乐部多年发展项目、完整事实驱动赛季故事、AI 更细致的续约与跨联赛现金建设、赛季间阵容恢复/轮换价值。不要将这一基础版本描述为整套长期叙事更新已完成，也不要把 `squadIds` 当作比赛中十二名参赛球员。

## 2026-10-08 本地审查状态

- 转会谈判 AI 已扩展为询价报告、俱乐部报价回应、球员年薪回应和其他球队求购；跨联赛搜索、还价状态和出售意向写入可恢复存档。交易仍使用六人制同位置球员交换，签约工资按球员 ID 保存，旧球员继续用原工资估算兼容。MyCareer 原有 2–4 赛季邀请规则未改；本次不包含合同年限/到期、租借或纯现金卖人。
- 新增 `transfer-ai.test.mjs` 与转会中心页面测试，覆盖卖方还价、球员工资还价、AI 求购、拒绝去重、球员归属和谈判存档恢复。完整 `npm test`（8 项浏览器测试）及 `npm run build` 已通过。
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


## 2026-10-13 Dream Squad rules stage 1

- Selected offers persist as pendingChoiceIds; closing/reopening/reloading keeps the same three distinct footballer identities. Signing consumes one choice contract and clears the offer.
- Legend, modern and choice packs consume their corresponding contracts; ordinary/position/defense packs consume tickets. Existing saves receive 10 of each contract once via normalization, for current testing; ordinary testing tickets are preserved. Final-stage wins grant a choice/modern/legend contract depending on the event.
- Opponents are derived only from event identity and stage, with fixed base-card lineups. Retries and user lineup/development changes cannot reroll or scale opponents. Match IDs remain unique per attempt.
- Card development: 12 total upgrades, +4 maximum per attribute, absolute 99 cap; purchase costs are 4/6/8 for upgrade bands 0–3/4–7/8–11. trainingSpent records actual costs. Free reset refunds those costs; old investments remain readable and refund at their historical cost of 4 per point.
- Player detail and binder show trained abilities/ratings. UI shows costs, contract balances/sources, saved-offer notice, training budget and refund. dist/index.html has a new app cache version.
- Checks: dream-team.test.mjs; two Dream Squad browser flows (saved offers, contract spending, legacy training/refunds, desktop/mobile); build; five-league fixture invariants (16 teams, 30 rounds, 15 home + 15 away).
- Next approved roadmap: stage 2 finite themed card box, target-player queries and ordinary-pack bad-luck protection. Not implemented in this stage. Production allowances still need separate configuration before publication.


## 2026-10-13 Dream Squad rules stage 2

- modern-stars is now a pinned 24-card Mbappe-themed box (1 legend, 3 elite, 10 gold, 10 silver). Each remaining card has probability 1/N and is removed on draw; global duplicates still convert to training points. boxDrawnIds and boxCycle persist. Exhausted boxes cannot consume contracts. Reset uses a native modal with explicit confirmation, keyboard containment and Escape cancellation; inventory and resources are retained without refunding spent contracts.
- World-scout tracks worldPity (0–39); after 39 consecutive non-legend draws the next is guaranteed legend. Any world-scout legend resets progress; other packs do not change it. UI shows base 2%, long-run guarantee-inclusive rate approximately 3.61%, current next-draw tier probabilities and remaining distance.
- Target search supports accents-insensitive names and separate card editions; targetCardId persists. Query shows current per-card probabilities for five random packs, target-position routing, removed/out-of-pool zeros, and correctly labels the first-candidate probability for three-choice rather than claiming aggregate odds.
- Old saves retain inventory, stats and training; missing stage-2 fields default safely. A one-time boxTestGrantVersion marker tops modern contracts to 30 for this testing build; no repeat top-up after spending. New tests validate 24 unique draws, exhaustion, reset, migration, probability normalization, natural/guaranteed legend resets and invalid progress rejection.
- Validation: dream-team.test.mjs; four Dream Squad Playwright flows including old training, persisted choices, box/target/guarantee and exhaustion; desktop and 390px inspection; build; league fixture format checks. app/css cache keys updated to dream-rules-20261013-2.
- Remaining roadmap: differentiated world tour/points league/budget cup, followed by draft events and expanded card identity content. No release deployment performed.

## 2026-10-13 Dream Squad rules stage 3

- Added an event center with independent world-tour, points-league and budget-cup progress. Tour has four three-match chapters and twelve named fixed opponents. League advances after every match, records six-match points/WDL/GF/GA and season history, and promotes at 10 points (champion reward at 14). Budget cup enforces a trained six-player total of 510 for both sides at launch and settlement; losses/draws can be retried. Rewards and completed stages are saved once.
- Main, budget and theme lineups save independently with their own balanced/press/counter tactics. Legacy saves copy the existing lineup into all three presets without losing cards, training, pack guarantees or remaining currencies. Actual local inventory verification retained 20 cards and 97 tickets.
- Match.playerLooks now carries each card's appearance for all twelve players. Live outfield rendering and specialized keeper poses use the same skin, hair and head details as the cards; numbers, body build and boot colors follow the card identity. Restart/halftime and replay retain the appearance mapping. Opponent identities are rendered too. Dream Squad match colors follow card kits.
- Own-team match statistics now exclude opposing players even if the same footballer appears on both sides. Post-match UI reports actual currency/contract rewards and returns to the event center. Match tactics persist in the active Dream Squad preset.
- Verified: dream-team.test.mjs, standalone dream-appearance.test.mjs (all twelve identities/numbers, twelve distinct keeper hairstyles, reset persistence and actual renderer differences), full npm test including season-loop and all 27 browser flows, production build, desktop/390px screenshots, UI detector (no findings), diff format check and localhost assets HTTP 200. Existing 16-team/30-round league and 53-match European cup checks pass.
- Local preview remains http://127.0.0.1:4177/ with app/css cache keys dream-rules-20261013-3. No GitHub push or deployment in this stage. Draft events and further card content remain subsequent work; generous testing allowances remain enabled.

## 2026-10-13 Dream Squad pull-rate rebalance

- Standard and eligible themed pools now use tier rates: Legendary 2%, Elite 4%, Gold 34%, Newcomer 60%. Missing tiers in a restricted pool transfer their weight to the lowest rarity present, so narrow position pools remain normalized without silently boosting rare cards.
- World Scout pity is 60 pulls. The existing miss counter is preserved; any saved count of 59 now guarantees the next World Scout draw. Theoretical long-run Legendary rate is about 2.85%; probability of at least one Legendary or Elite in ten standard draws is about 46.1%.
- Modern Stars keeps its fixed 24-card, no-repeat box and now uses those tier weights. Odds shown for each remaining card follow its current tier share and remaining count. Exhausted tiers transfer weight to the lowest remaining tier. Icon Vault retains its prior 2:12 Legend-to-Elite ratio and remains explicitly a top-tier-only pool.
- Preserved the test build allowance: 100 ordinary tickets and 10/30/10 starter contracts. No league or match-count configuration was touched. Existing save pity progress is preserved.
- Updated the scout copy, cache version and existing focused assertions to the new rates and 60-pull guarantee. `npm run build` passed. Automated tests were not run in this turn. No GitHub push or deployment was performed.

## 2026-10-13 Dream Squad theme tour

- Added an independent nine-match Theme Tour to the offline AI event center, split into three chapters. Results always advance; a loss does not erase progress or block the guaranteed end reward. Existing tour, points league, budget cup, club leagues, and their fixture counts remain separate.
- Each match shows a non-blocking lineup composition bonus and a football objective before kickoff. Chapter lineup rules use existing current/legend era data; objectives check actual match stats (shots on target, completed passes, tackles, defender goals, assists, team goals). Meeting both grants 2 training points; finishing a chapter grants 4; every completed fixture grants one test signing ticket.
- Completing all nine matches grants one saved direct-pick reward from a disclosed 18-card shortlist covering all six positions. The reward survives reloads; same-edition duplicates convert to 4 training points. Match history stores objective progress, and post-match shows the result.
- Legacy Dream Squad saves receive empty Theme Tour progress during normalization. Existing pixel portraits and card appearance objects are reused.
- `npm run build` passed. Automated tests were not run in this turn. No league setup, team count, or league fixture count was changed.

## 2026-10-13 Dream Squad tactical signatures

- Added 15 signature roles derived from each card's existing position and ability profile, including keeper, defensive, fullback, midfield, wing and striker archetypes. The role is shown on cards, card reveals and player details; no extra player attribute or save migration is required.
- Added the role-search scouting pack. It filters the live card pool by signature role, and displayed rarity/card odds are recalculated from that filtered pool. Draws still consume the normal signing ticket.
- Added a small tactical-fit bonus for balanced, press and counter tactics. It uses existing abilities and only applies in Dream Squad matches; the tactical bonus recalculates when the user changes tactic during a match. Opponent role bonuses follow the opponent's match style.
- Match setup and settlement retain the role-fit summary so the event center and result view can explain which cards fit the selected tactic. League team counts, fixture counts, other game modes and card appearance rendering were not changed.
- Validation: production build passed; one-off self-check confirmed all 15 roles have cards in the current pool and all 30 player/tactic skill paths resolve. `git diff --check` passed with only Git line-ending notices. Full test suite and browser visual/E2E play were not run. No GitHub push or deployment performed.

## 2026-10-13 Dream Squad card pools and signing rewards

- Expanded the card catalog from 216 to 252: 18 new rising-player identities and 18 peak-season editions. Existing appearance indices stay stable; alternate editions reuse the same footballer pixel model on card and pitch.
- Added the Rising Stars and Peak Season signing pools, bringing the scout center to nine pack types. Ordinary eligible pools use Legendary 4%, Elite 12%, Gold 38%, Newcomer 46%; pool-specific odds are normalized to the rarities actually present. Icon Vault uses a disclosed 20% Legendary / 80% Elite split.
- Standard and themed ticket packs share a ten-draw guarantee: the next draw guarantees Elite+ when the selected pool has those tiers, otherwise its highest available tier. World Scout has a separate 4% Legendary rate and a 40-draw guarantee. Existing 60-draw saves migrate to the preserved next-draw guarantee.
- Theme Tour challenges now grant an extra signing ticket when both lineup and match objective are met; each completed three-match chapter grants two more tickets. Existing match participation, competition and contract rewards remain in place. The one-time testing balance remains 100 tickets; no repeat top-up was added.
- Added focused tests for catalog sizes, identity consistency, exact tier odds, both pity paths, legacy pity migration, theme-ticket rewards, and existing event progression. `node --test dream-team.test.mjs` and `npm run build` passed. No club/MyCareer data, league teams, fixtures or match counts changed. No GitHub push or deployment performed.
- Local preview assets use cache key `dream-rules-20261013-8` so the refreshed card catalog and odds load after a page refresh.

## 2026-10-13 Dream Squad signing experience

- Added single and ten-signing flows using the same sequential RNG, rarity weights, duplicate conversion and shared pity rules. A finite box with fewer than ten remaining cards, or an insufficient ticket/contract balance, rejects the entire batch before spending.
- Draws save a pending receipt together with inventory/currency updates before showing the pixel tunnel entrance. A failed write rejects the signing; reload restores the same receipt without spending again. Completing the result view clears only the receipt. Double-clicks are blocked while a draw is pending.
- Added a skippable two-second pixel tunnel entrance (four seconds for a single Legendary), an optional single-duplicate animation skip, and reduced-motion handling. Ten-card results support individual flips, reveal-all, new-player/new-edition/duplicate labels, pity markers, result totals, and card details with return-to-batch navigation.
- Wishlists persist up to three exact card editions. Target queries show current per-card odds by pack, finite-box remaining cost and the theme-tour direct-pick path when available; rarity pity is explicitly distinguished from a guaranteed named player.
- New draw-state fields migrate to empty defaults in existing saves. The catalog stays at 252 cards / 210 footballer identities and league/fixture configuration is unchanged.
- Validation: Dream Squad and signing unit suites passed; seven targeted browser flows passed, including the older box/choice/formation/cultivation flows, plus a final rerun of the two new signing flows after card-detail navigation was added. Desktop and 390px screenshots were inspected. Production build and diff checks passed. Cache key: dream-signing-20261013-9. No GitHub push or deployment performed.

## 2026-10-13 Dream Squad archive player wave

- Added 36 cross-era players, six per position, raising the catalog to 246 footballer identities and 288 card editions. The new World Football Archive pack shows 36 unique identities and includes Legendary, Elite, Gold and Silver cards.
- The archive uses the ordinary 4% / 12% / 38% / 46% rarity weights and existing ten-draw / world guarantees. It does not increase the chance of a high rarity; it expands which players can appear within the disclosed rarity.
- New IDs sort after existing player identities so prior deterministic pixel appearances remain stable. New archive players are not included in the starter roster; they must be scouted.
- Validation: catalog/identity/position/rate unit checks, signing-state checks, archive pack browser flow and production build passed. Existing league team and fixture counts are untouched. Scout detail now distinguishes card editions from unique player identities (the archive-tier players also expand Icon Vault to 84 cards / 49 identities). Cache key: `dream-archive-20261013-12`. No GitHub push or deployment performed.

## 2026-10-13 Dream Squad published rarity transparency

- The scout UI now separates the displayed base odds from the realized long-run odds while using World Scout continuously. It computes the stationary distribution of the shared ten-draw Elite+ guarantee and the independent 40-draw Legendary guarantee, instead of showing a figure that counted only one pity system.
- Current World Scout base rates remain Legendary 4%, Elite 12%, Gold 38%, Silver 46%. With both guarantees and uninterrupted use of this pack, modeled long-run rates are Legendary 5.52%, Elite 14.30%, Gold 36.27%, Silver 43.91%. Target-card odds still recalculate from the active pool and current pity state.
- Validation: exact Markov-state odds assertions, Dream Squad/signing unit suites, archive pack browser flow with displayed odds, and production build passed. These figures are model expectations, not guarantees for a short sequence.

## 2026-10-13 Dream Squad meaningful three-card choices

- Three-choice signing now presents three distinct positions, chosen sequentially with the existing rarity weights inside the remaining positions. The player picks one; the other two are not granted. This makes each offer a real squad-building decision while preserving contracts, saving, and existing card appearance data.
- Updated the pack and target-query copy to distinguish candidate appearance from guaranteed signing. Tests now verify every saved offer contains three positions and survives reload unchanged.
- Validation: Dream Squad and signing unit suites, the focused browser flow for saved three-choice offers, archive/odds browser flow, production build, and diff checks passed. Cache key: `dream-identity-fair-20261013-16`.

## 2026-10-13 Dream Squad edition-neutral player odds

- A pool could previously give a player with three Legendary editions three times the identity-level chance of a player with one Legendary edition. Draws now select rarity, then uniformly select a player identity within that rarity, then select one of that identity's editions.
- Wishlist odds now use the same identity-first model and divide the selected player's rarity share across that player's editions at the same rarity. Rarity rates, pity limits, and card pool sizes are unchanged. The active pack explains the rule.
- Added checks that all player identities in each rarity have equal aggregate odds and that edition odds sum back to the identity share across World Scout, Icon Vault, defensive, archive, and Peak Season pools.
- Validation: Dream Squad/signing unit suites and targeted browser flows pass; production build succeeds. Cache key: `dream-identity-fair-20261013-16`.

## 2026-10-13 Dream Squad rarity-based duplicate value

- Duplicate editions now convert to training points by tier: Silver 4, Gold 6, Elite 8, Legendary 12. This makes a high-tier repeat contribute enough for one progressively priced training point without turning duplicates into another player copy.
- Single-card reveal, ten-pull card rows, and the ten-pull total display the stored reward value. Existing unfinished receipts keep their original flat 4-point payout through migration.
- Validation: per-tier repeated-draw tests, legacy receipt migration, batch parity, browser ten-pull total, and production build. Cache key: `dream-duplicate-rewards-20261013-17`.

## 2026-10-13 Dream Squad odds identity counts

- Rarity rows now show both the number of card editions and distinct footballer identities. This matches the identity-first draw rule and helps players understand why a tier's card count is not the same as the number of equally weighted targets.
- Validation: browser assertions compare the displayed World Scout and archive counts with the underlying pools; ten-pull reveal totals, legacy receipt migration, Dream Squad unit suites, and production build pass. Cache key: `dream-odds-identity-count-20261013-18`.

## 2026-10-13 Dream Squad player-quality odds

- The scouting center now shows the exact current single-draw probability of receiving a 90+ overall card in each selected pack, computed from the active pool and current pity. This supplements rarity odds with a gameplay-readable quality threshold; three-choice remains described as a candidate offer instead of a direct signing probability.
- Each rarity row also distinguishes card editions from footballer identities. Browser checks verify World Scout at 15.82% and Archive at 16.00% for 90+ cards, and verify counts against their actual pools.
- Validation: Dream Squad/signing/appearance suites, four targeted browser flows, production build, and scoped diff checks. Cache key: `dream-90plus-rate-20261013-19`.

## 2026-10-13 Dream Squad rarity consistency and targeting audit

- Added career-start editions for the existing player identities, expanding the catalog to 246 identities / 534 card editions while preserving existing base IDs and shared pixel appearances. Base and eligible themed pools use Legend 0.1%, Elite 1.4%, Gold 16.5%, Silver 82%; shared ten-draw and 100-draw World Scout pity remain disclosed.
- Fixed icon and peak-season editions whose card rarity disagreed with their actual overall. Every edition now uses one rating map: 90+ Legend, 85–89 Elite, 70–84 Gold, below 70 Silver. This makes the exact base chance 90+ 0.10% and 85+ 1.50%, matching the displayed rarity rates. With both pity systems active, modeled long-run rates are 90+ 1.05% and 85+ 2.39%.
- Audited all standard/themed packs, six position filters, and all role filters: no filter increases the base 85+ or 90+ odds. The finite 24-card growth box contains only low-rated career-start editions. Direct Star Signing remains deterministic and is earned from major competition victories; starter test balances remain enabled.
- Three-choice now reports exact candidate-offer chances: at least one 85+ among three distinct-position candidates is 4.43%; at least one 90+ is 0.30%. The UI labels these as candidate appearance rates, since the player chooses one of the three; ordinary pack 85+/90+ rates remain 1.50% / 0.10%.
- Validation: rating-to-rarity consistency, exact World and three-choice probabilities, every pack/position/role ceiling, Dream Squad and signing unit suites, focused browser suite (7/7), full `npm test` (all checks and 31/31 browser tests; run before the final three-choice copy/calculation addition), and production build passed. The final three-choice change passed the Dream Squad/signing unit suites, focused browser suite (7/7), and rebuild. No league/team or fixture counts were modified. Local preview: http://127.0.0.1:4177/ with cache key `dream-rarity-consistency-20261013-21`. No GitHub push or deployment performed.

## 2026-10-13 Dream Squad rotation-player wave

- Added 36 real former professionals across six positions (six each) as lower-rated rotation cards. Their computed ratings are 72–82, below the 85+ Elite threshold; each also receives the existing lower-rated Career Start edition. The pool is now 282 distinct footballer identities / 606 card editions, with 47 base identities per position.
- They extend World Scout, defense, position and role pools; they do not alter the 90+ / 85+ draw weights or the Icon Vault. The default starter collection is unchanged. New identity IDs sort after all earlier IDs, and a saved appearance fingerprint proves the original 246 pixel identities remain unchanged.
- Validation: catalog and six-position counts, all new ratings below 85, old appearance fingerprint, exact original starter IDs, Dream Squad/signing/appearance unit suites, 9 focused browser tests, production build and full `npm test` (all unit/season checks and 31/31 browser tests). Season verification still reports 240 primary-league matches, 960 world matches and 53 cup matches. Cache key: `dream-rotation-wave-20261013-22`. No GitHub push or deployment performed.

## 2026-10-13 Dream Squad career-start rating calibration

- Career Start editions previously used an ID-hash score between 58 and 77, unrelated to their base player. They now derive from the base overall minus a deterministic 15–22 points, with a 59–80 generation bound to keep the position-adjusted rating at 54–83.
- All 282 career-start editions remain below their base edition and below 85. Rotation-player career cards remain silver. Gianluigi Buffon's career-start card is now 83 instead of 61; the World Archive finite pool shifts one edition from Gold to Silver. Published rarity weights and 85+/90+ odds do not change.
- Validation: Dream Squad, signing and appearance unit suites passed; the targeted Dream Squad/signing browser suite passed 10/10; production build passed. Cache key: `dream-career-start-rating-20261013-24`. No team, schedule, or match data changed; no GitHub push or deployment performed.

## 2026-10-13 Dream Squad Star Signing selection sync

- The Star Signing dropdown now defaults to the strongest unowned eligible card, and the preview, selected value, and signing action all use that exact card. If no eligible card remains, signing is disabled.
- Validation: the targeted browser test confirms the visible card is the one granted, plus the Dream Squad/signing suites and production build. Included in cache key `dream-career-start-rating-20261013-24`.

## 2026-10-13 Dream Squad ordinary-player expansion and rating review

- Added 26 distinct ordinary professional identities from the published FC26 Swindon Town launch roster, rated 53–66. Their final position-weighted overall is calibrated to the referenced launch overall. The catalog now contains 308 identities / 632 editions. Existing 606 editions retain their ratings; no historical-player regrading has been applied yet.
- Ordinary players appear in World Scout and compatible position/role pools. They receive no redundant Career Start edition. Starter collection, theme reward choices and limited box remain the existing sets. Historical/prime players are not deliberately weakened to create common filler.
- Stored source, reference position and reference period on new player rows. Appearance fingerprints prove all previous 282 pixel identities remain unchanged; all 308 identities render distinctly. Base 85+/90+ odds remain 1.5% / 0.1%.
- Validation: Dream Squad/signing/appearance unit suites, production build and 11/11 focused browser tests passed, including an ordinary card's search, score and pixel portrait. Cache key: `dream-ordinary-player-wave-20261013-25`. No GitHub push or deployment performed.
- Created an independent rating-review workbook and searchable HTML in `C:/Users/何厚臻/Documents/Codex/2026-10-05/c-users-documents-codex-2026-09/outputs/dream-squad-rating-review-20261013/`. It lists the current 632 cards, individual proposals for all 308 identities and all card editions, exact IDs/categories, current ability data, sources and audit findings. Proposals are design target overalls, not newly fitted match attributes; approval and attribute calibration are still needed before applying the regrading.
- Final verification: exported workbook was reimported and every current/proposed row checked against the data snapshot (632 IDs / 308 identities). A disposable score edit recalculated changes, categories, totals and player comparison. HTML search/filter/pagination and 390px layout passed. The season-loop regression also passed with 240 primary-league, 960 world and 53 cup matches. Local 4177 returns HTTP 200 with the new cache key.

## 2026-10-14 Dream Squad catalog reconstruction v4

- Rebuilt all 308 original identities, added 20 historical players and 1,353 sourced professionals: 1,681 identities / representative cards. Removed all 282 synthetic Career Start editions and merged all 42 generic boosted editions. Preserved original identity IDs and portraits; new portraits are distinct.
- `dream-player-catalog.mjs` stores the source-backed records and 324 legacy edition mappings. Official EA snapshot: 16,228 male records, fetched 2026-10-14; API does not expose update time. 52 whole source team rosters span 14 leagues. Do not describe this as audited 2025/26 real-world performance or live registration data.
- 197 historical peak design profiles, supported by 195 retrieved identity biographies and two official peak-season records. Values, peak-window selection and cross-era ordering remain editorial estimates, not objective measurements. Attribute values are no longer adjusted back to seedOverall; historical/seed/source-overall values cannot change strength. Nine role formulas include the wide creator WM; integer hundredth weights ensure spreadsheet/game half-point rounding parity.
- Removed old random templates, shared ceilings and icon/peak additive generation. Role labels and gameplay profiles share one definition. Defender/keeper versus attack attributes remain separated. Every player carries referencePeriod/referenceSource/sourceKind/estimatedAbilities. Historical nationality/foot metadata not yet verified is left unavailable.
- Saves migrate career/icon/boosted IDs in collection, lineups/presets, wishes, target, box progress, pending reveals and result records. Merge max ability increments, preserve/refund total training spend, sum personal stats and pay duplicate compensation once. Current card boxes contain real base cards; empty tier weights still roll into the lowest existing tier and the UI displays actual odds.
- Final score bands: 45–98; legend 128, elite 91, gold 726, silver 736. World Scout 90+/85+ base odds remain 0.1%/1.5%. Historic-only pools no longer contain artificial silver versions.
- Validation: model/catalog/signing suites and production build pass; full Node/season regression passed (240 primary, 960 world, 53 cup matches). Full browser run initially 32/34; corrected related obsolete odds assertion and reran Dream Squad/signing 12/12. The unrelated large season-restore browser case exceeded its old 60s total test budget, then passed alone at 120s without business changes. Workbook export reread matches all 1,681 ratings and 23 abilities per row, all 308 comparisons and 3,362 score/tier formulas; input-edit recalculation and rendered views checked.
- User-facing workbook and report: `C:/Users/何厚臻/Documents/Codex/2026-10-14/wo/outputs/dream-squad-rebuilt/`. Preview cache key: `dream-catalog-reconstruction-20261014-v4`. No commit, push or deployment performed; keep existing unrelated working changes.





# MATCH-LEDGER-01：比赛结算与可追溯履历

更新：2026-10-19。实现基于本机工作区，未提交、未推送、未部署。线上版本可能落后。

## 当前状态

| 部分 | 状态 |
|---|---|
| 阶段0 R5/R6 | 已修复，专项与浏览器通过 |
| 阶段1 结果合同与路径表 | 已实现合同适配层，路径表见下 |
| 阶段2 结算幂等 | 主链路已接入固定 matchId 与收据；故障注入和完整多标签并发未验收 |
| 阶段3 履历查询 | 已实现 `playerCareerLedger`，覆盖当前/归档/国家队/青训与转会分段 |
| 阶段4 档案界面 | 现有历史排名档案内新增“可追溯履历”，浏览器生成存档通过 |

## 1. 实际路径表

| 入口 | 生成器 | 编号生成时点 | 双方顺序 | 参赛行 / 个人统计 | 副作用 | 保存 | 已有防重 |
|---|---|---|---|---|---|---|---|
| 俱乐部亲自比赛 `src.jsx: finishCurrentMatch` | 动作 `Match` | 结算前由 `currentFixture`/`cupNextMatch` + `matchIdentity` 固定 | `completeWeek`/`completeCupMatch` 在适配边界按 home/away 转换一次 | `match.stats` 或 `journeyPlayerLines`；`createMatchRecord` 补姓名/号码快照 | 赛果、联赛/杯赛累计、`season.players`、`playerData.careerStats`、恢复/默契/财务/诉求（`recordLifeMatch`）、成长、新闻、赛季颁奖 | `storeCareer`/`storeSeason` 整档快照 | `session/matchId` 收据 + `finishCurrentMatch` 预检查 |
| 场内模拟/接管 `finishEventSimulation` | EventMatch | 结算前 `matchIdentity` | 同上，用户侧比分在 `completeWeek` 内翻转 | `result.playerStats` | 同上 | 同上 | `session.settled` + 收据 |
| 不进场事件模拟 `SimulationPage` → `finishEventSimulation` | EventMatch | 同上 | 同上 | 同上 | 同上 | 同上 | 同上 |
| 长期模拟 `long-simulation.mjs: simulateNextScheduled` | EventMatch | 模拟前由 `nextCalendarFixture` + 杯赛 phase/round + `matchIdentity` | 同上 | `result.playerStats`（主体与替补分别保留） | 同上 + `finishCareerMatch`/`finishJourneyMatch`/`commitCareerGrowth`/新闻 | 调用方逐场 `storeCareer`/`storeSeason`；本函数先克隆整季，异常不污染原对象 | `complete*` 收据；调用方逐场保存后才推进下一场 |
| MyCareer 首发/替补 | 动作 `Match` 或 EventMatch | 同上 | 上场者与原槽位球员分别记录 | `journeyPlayerLines` 保留 `substitutedOut` 行与分钟边界 | 职业履历、旅程成长、关系/承诺 | 同上 | 同上 + `finishYouthMatch` 的 fixture index |
| 青训 `finishYouthMatch` | 青训 `Match` | 以 `journeyFixture.index` 标识 | 只有主角视角 | `journey.youthResults` 摘要 + report | 训练点、信任、故事；不进入联赛/职业累计 | `storeCareer` | 同一 fixture index 只写一次 |
| 国家队玩家比赛 `finishCurrentMatch` 国家队分支 | 国家队 `Match` | `national:<fixture.id>` | `nationalMatchResult` 转为己方视角，存储前再转回主客 | 国家队履历行 + report | 国家队 caps/goals、世界国家队记录、故事 | `storeCareer` | `nationalCareer.history[].id` + 收据 |
| 国家队后台比赛 | `backgroundResult` | 使用 fixture 自身 id | 主客 | 只有聚合比分，无个人行 | 赛事比分、晋级 | 随 `settleNationalFixture` 保存 | fixture 已有 `score` 跳过 |
| 同轮其他联赛 | `completeWeek` → `recordSimulated` | 记录时由相同 `matchIdentity` 公式生成（固定 week/双方） | 主客固定 | `simulatedPlayerLines` | 对方联赛 results/players、`playerData.careerStats`、财务 | 同整档快照 | 本轮收据覆盖全部 matchId |
| 自动杯赛 | `advanceScheduledCup` → `playRound` | phase/round 固定 | 主客固定 | 模拟逐人统计 | 杯赛 results/players、`recordLifeMatch` | 同整档快照 | 阶段推进 + 收据 |
| 训练 / Dream Squad | 独立练习/卡牌 | 不生成职业比赛 | — | — | 不进入职业统计 | 各自流程 | 不纳入本轮 |

## 2. 结果合同

`match-ledger.mjs: normalizeMatchResult` 把已有结果显式化为：

| 部分 | 字段 |
|---|---|
| 编号与上下文 | `matchId`、`seasonId`、赛事、联赛、phase/round/week、date、source |
| 赛果 | 明确 `home`/`away`、`score`；点球大战在 `result.shootout` 单独保存 |
| 参赛者 | `playerId`、当场 `teamId`、姓名/号码快照、首发、上下场分钟、是否实际出场 |
| 事件 | 分钟、动作人、受益队、助攻、乌龙；缺失不猜 |
| 完整程度 | `participants: full/missing`、`events: full/summary/missing`；缺失不等于 0 |

`matchIdentity(season, {competition, week|phase,round, home,away})` 与 `createMatchRecord` 共用同一公式。相同球队同年再战、两回合杯赛、国家队不同赛事、青训场次均可区分；旧球员 ID 不重编号。

## 3. 结算收据与幂等

- `season.matchSettlements` 保存 `{matchId, seasonId, competition, phase, round, week, home, away, score, homeIsUser, penalties, playerDigest, digest}`。
- 同一 `matchId`、同一业务内容重复提交：`completeWeek`/`completeCupMatch`、`finishCurrentMatch`、`finishEventSimulation` 直接返回，不再次模拟、不推进 week/cup、不重复累计。
- 同一 `matchId`、不同比分或不同球员数据：抛出“已结算，重复提交的结果不一致”，原状态不变。
- 收据随 `archiveSeason`、`carryIdentity` 与 JSON 备份往返保留；历史移入 `season-archives` 后仍可识别。
- 持久化仍使用现有整档保存事务：调用方先克隆赛季，成功后再写 IndexedDB；保存失败时 UI 保留本次结果并停止长期模拟。未新增服务器、消息队列或第二套生涯系统。
- 未解决：低层 `completeWeek` 在一次调用中若在后半轮抛出异常，内存对象可能已有前半轮累计；现有页面/长期模拟入口通过先克隆规避，但未做通用故障注入验收。多标签页并发写入仍未解决。

## 4. 可追溯履历查询

`history.mjs: playerCareerLedger(season, playerId, career?)` 复用 `playerCareerDossier`，并追加：

- 当前赛季联赛/欧冠与归档赛季；按 `row.teamId`（当场球队）分段，赛季中转会保留两段。
- 国家队 `nationalCareer.history` 与青训 `journey.youthResults` 分开展示；国家队进球不计俱乐部累计，青训不进成年职业累计。
- 未上场替补不计出场；乌龙球不计本人正常进球，单独标 `ownGoals`；点球大战保持独立。
- `careerTotals` 保留存档累计；`baseline` 表示无法从逐场明细证明的旧档案差额，`incomplete` 列出字段，界面明确提示“历史明细不完整”，不按当前球队分摊。
- 同名不同 ID 各自查询；退役/离队者仍可从归档读取。

UI：`stats.jsx` 历史排名档案中新增“可追溯履历”，提供俱乐部/国家队/青训切换、赛季与效力球队分段、最近比赛与（有保存报告时）打开复盘入口。

## 5. 本轮实际验证

- `node --test match-ledger.test.mjs` 7/7：固定编号、合同字段、重复结算、同 ID 异内容拒绝、杯赛含点球、归档/跨季/备份收据、行序无关摘要。
- `node --test player-career-ledger.test.mjs` 4/4：俱乐部/国家队/青训分离、当场球队分段、乌龙与未上场、旧档基线、同名独立。
- `node --test player-profile-authority.test.mjs` 13/13：R5 号码冲突（首发/替补/11 号占用/耗尽原子失败）与 R6 门将分项越界/NaN。
- `node test.mjs`、`node season-loop.test.mjs`、`npm run build` 通过。
- 浏览器：`browser-tests/career-ledger.spec.mjs`（生成退役生涯 → 历史排名 → 按 playerId 打开档案 → 切换范围）1/1；`browser-tests/player-profile-authority.spec.mjs` 2/2（原资料链 + 号码冲突刷新）。
- 未跑完整 Playwright 套件；未使用真实用户存档；未验证跨标签页并发、IndexedDB 失败注入、动态回放播放；未提交/推送/部署。

## 5.1 P0 整改 R7–R13（2026-10-19 第二轮）

| 项 | 修复与证据 |
|---|---|
| R7 | `makeMatch`/事件模拟 session 在开赛前保存固定 `settlement`（matchId、双方、week/phase/round）；`finishCurrentMatch`/`finishEventSimulation` 只使用该上下文，结算前核对当前场次；低层首次提交也核对 matchId 与当前赛程。回归：错位 matchId 被拒绝且状态不变。 |
| R8 | 结算摘要改为完整规范化指纹：全部个人统计字段、出场边界、球队统计、乌龙/助攻事件、点球与胜者；重试逐字段比较，缺省不默认为 0。回归：单改传球/抢断/扑救/出场秒数/换人分钟/射门均拒绝；行序变化仍可重试。 |
| R9 | `completeWeek`/`completeCupMatch` 改为整轮工作副本提交，全部成功才发布；第二联赛注入失败时 week、results、players、收据均不变。保存失败新增 `pendingSave` + 页面“重试保存”，重试只保存同一结果，不重新模拟；浏览器注入 IndexedDB/本地存储不可用后重试通过。 |
| R10 | 收据不再裁剪；`findSettlement` 查询当前与归档收据；超 4001 条、归档转存后最早比赛仍防重。 |
| R11 | 导入校验当前及归档收据的版本、结构、比分、摘要、唯一 matchId；字符串、重复 ID、损坏归档拒绝，旧档缺字段可导入。 |
| R12 | 履历投影保留全部 `LEDGER_FIELDS`，缺失为 null、零为 0；当前与归档逐字段对账，抢断/传球/射门/扑救不再丢。 |
| R13 | 历史排名把真实 `career` 传入 `playerCareerLedger`；非空国家队/青训浏览器样本显示正确；比赛明细可展开，报告按钮在有保存报告时接线；浏览器实际验证的是展开与范围切换，未把展开称为打开复盘。 |
| R14 | 待保存状态统一为 `advanceBlocked()`：长期模拟、直接模拟、事件模拟、国家队动作、青训、下一场与跨季入口都在业务层检查；`locked` 同时合并 `saveError`/待保存。保存失败浏览器反例中“不进场模拟”禁用，恢复存储后只保存原来那场，week 从 0 到 1，未推进到 2。 |
| R15 | 结算字段扩到 `bicycles` 等实际累计项；事件摘要纳入 receipt 并在 `completeWeek`/`completeCupMatch` 与页面早退分支中比较。实战 `finishCurrentMatch` 在早退前构造本人/替补行、球队统计与进球事件，国家队分支同样构造；不再只比比分。回归：改事件受益方/动作人/乌龙、bicycles 均拒绝且状态不变。 |
| R16 | 收据格式区分 v1/8 位、v1/32 位、v2/32 位；v1/32 使用上一轮字段集合（不含 bicycles）比较，v1/8 只用可核验的比分与旧人物摘要，v2 用当前完整契约。导入、相同结果重试、继续杯赛、跨季与重复兼容准备通过；异比分仍拒绝。 |

P0 后新增实际结果：`match-ledger.test.mjs` 15 项、`player-career-ledger.test.mjs` 7 项、`player-profile-authority.test.mjs` 13 项通过；`career-ledger.spec.mjs`、`settlement-retry.spec.mjs`、`player-profile-authority.spec.mjs` 浏览器通过；`node test.mjs`、`node season-loop.test.mjs`、`npm run build` 通过。`appearance-studio-render.test.mjs` 仍为 20/24，`player-sprite.mjs` 在本轮开始前已是未提交修改状态，本轮未改精灵代码，单列为待查既有问题，不删断言。

## 6. 当前规模实测（非发布承诺）

生成样本：英格兰联赛 800 名球员、240 场联赛、53 场杯赛；Node 24 本机，单次运行：

| 项目 | 数值 |
|---|---|
| 单个联赛轮结算（含全部世界联赛与收据） | 79.4 ms |
| 完整赛季（240 联赛 + 53 杯赛） | 1.21 s |
| 归档一季 | 108.3 ms |
| 单球员履历查询（36 场明细） | 5.1 ms |
| 紧凑备份（单存档） | 19.0 MB |

未测手机、万人规模或长多年存档；以上不构成性能承诺。

## 7. 后续建议

1. 为 `completeWeek`/`completeCupMatch` 增加显式事务包装或阶段快照，完成“注入错误无半轮累计”的故障注入验收。
2. 把后台国家队与青训也纳入统一收据读取层（当前分别依赖履历 id 与 fixture index）。
3. 在完整 Playwright 与真实存档只读体验中复核结算耗时、读档和档案查询耗时。
4. 多标签页写冲突另立任务，不在本轮声称解决。

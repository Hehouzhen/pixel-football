# 任务与交接清单

更新：2026-10-19。状态只表示此处注明的范围。下列实现均为本机工作区状态，不能等同于当前线上版本。

**本次最新复审：R14在已检查范围内通过；R15/R16各有一个未闭合入口。** Codex独立33项、保存重试/履历浏览器2项通过。实战/国家队已有收据分支仍缺完整事实比较；v1/32位中间收据仍被误送8位兼容分支。详见CODEX_R14_R16_FOLLOWUP_REVIEW_20261019.md。先补这两处，再进入G1/G2；下方旧复审结论按历史记录阅读。

**最新P0复审：主要R7—R13修复有进展，仍需修R14—R16。** Codex独立31项专项、履历浏览器1项和保存重试浏览器1项通过；另独立浏览器确认保存失败后直接模拟仍可推进第二场，Node确认事件/倒钩冲突漏检及旧8位摘要兼容失败。见CODEX_MATCH_LEDGER_P0_REVIEW_20261019.md；G1—G6仍未开始，不进入新功能或发布。下方首次审查记录为历史证据。

**Codex最新复审：MATCH-LEDGER-01核心验收不通过。** R5/R6的13项专项通过；新增结算/履历测试合计24项通过、相关身份归属50项通过，但独立反例发现R7—R13：赛前ID未绑定、摘要漏字段、半轮累计、历史收据裁剪、导入漏校验、履历统计丢失与主角上下文未传。以CODEX_MATCH_LEDGER_REVIEW_20261019.md为下一轮修复依据，表内“阶段0–4本机实现”不得解释为通过验收。

| ID | 事项 | 状态 / 负责人 | 验收证据或下一步 |
|---|---|---|---|
| SYNC-01 | 建立双方共同使用的需求、规则、决策与当前进度基线 | 文档交付 / Codex | 本轮仅文档与一致性检查；用户可按新要求继续补充 |
| DB-SPEC-01 | DeepSeek人物数据库工程完整开发要求 | 文档交付 / Codex | PLAYER_DATABASE_REQUIREMENTS.md；定义A—G阶段、稳定ID/世界/卡牌边界、主档、关系、统计、事务、迁移和验收矩阵；不表示各阶段已实现或已授权全部迁移 |
| CAREER-01 | MyCareer 顶部长期模拟及职业生涯接线 | 专项验证通过 / Codex | 浏览器“顶部长期模拟入口逐场保存并可停止”通过；不代表青训长期模拟开放 |
| CAREER-02 | 无欧冠资格联赛结束后可继续、旧档补结算 | 专项验证通过 / Codex | 浏览器“无欧冠资格…旧档也能补结算”通过；用户实际存档尚待体验确认 |
| CAREER-03 | 自动排阵缺少替代者时主角改首发，合并核对名单并明确缺口 | 专项验证通过 / Codex | 15项职业旅程测试、长期模拟入口浏览器测试及构建通过；真实用户存档待体验。修改 career-journey.mjs/.test.mjs 与构建产物。不增加位置兼任、不改真实存档、不发布。基准 main / 2d54b7aa2f915e6c1b3968a18d13212618963d22，保留既有未提交工作 |
| CAREER-04 | 休赛期主动转会、表现驱动的关注与正式报价 | 本机实现并专项验证 / Codex | CAREER_TRANSFER_MARKET.md；核心7项、相关职业旅程与升级22项、浏览器2项通过并构建。独立页面、实际转会/租借、合同和报价保存。真实存档平衡待用户验收；未跑全库、不发布 |
| ID-01 | 身份入口清单、统一查询、只读审计、固定样本 | 部分实现，尚未完成验收 / 暂无执行者 | 见 PLAYER_IDENTITY_FOUNDATION.md；完整身份回归仍有失败记录 |
| ID-02 | 国家队实际动作比赛的比分受益队与进球事件归属错配 | R3/R4 已补齐，待 Codex 复审 / DeepSeek | R1/R2 已过复审；本轮补 R3 换人后传中完成统计归原人、R4 国家队履历报告复用导入校验。保留种子17、36；未跑完整 Playwright；未提交、未发布 |
| ID-03 | 主角镜像双写、历史位置回退、分散结算、重复累计风险 | 第一阶段完成（R5/R6 已修复），待复审 / DeepSeek | 主档权威、统一写入口与成长提交已实现；R5 号码冲突改由 `updateCareerProfile` 原子处理并把真实改号显示给用户，R6 门将分项先规范化再校验。13 项资料专项与 2 项浏览器通过；结算幂等转入 MATCH-LEDGER-01 |
| MATCH-LEDGER-01 | 统一比赛结算、防重重试与可追溯球员履历 | P0 R7–R16 已整改，待 Codex 复审；G1–G6 未开始 / DeepSeek | R14 统一待保存推进保护、R15 事件/bicycles 贯穿冲突检查、R16 旧 8 位收据兼容。14 项结算、7 项履历、13 项资料专项，test.mjs、整季、构建及 4 项浏览器通过；G1–G6 按文档规则未启动 |
| ID-04 | 危险状态下选择贴近本方球门线的身后出球点，导致回传乌龙 | 待评估 / 暂无执行者 | ID-02 修复后事件已能正确记为乌龙；120 场固定样本出现 4 次（种子17、36、56、106）。是否加“本方禁区/球门线附近回传保护”需另立任务并做比赛概率与受控对照，不能顺手改动 |
| NATIONAL-01 | 国家队征召、比赛、赛事与俱乐部关联 | 已有本机实现，持续验收 / 暂无执行者 | 以代码与 NATIONAL_CAREER_IMPLEMENTATION.md 为准；并非全部真实官方赛制 |
| QA-01 | 完整全库验证与发布前核对 | 待执行 / 暂无执行者 | 历史全套通过不能覆盖当前脏工作区；先确认 ID-02/ID-03 第一阶段实际通过范围，再跑完整 Playwright/全库与真实存档体验 |
| RELEASE-01 | 当前全部未提交改动的审阅、提交与网页部署 | 未开始，当前未授权 / 暂无执行者 | 先核对纳入范围和 QA-01，不把旧提交当成本机完整版本 |

## ID-03 第一阶段：当前资料写入口与 MyCareer 兼容同步（2026-10-19，DeepSeek）

### 后续大升级执行文档

WORLD-CAREER-02（待领取，尚未实现）：用户要求与当前整改合并交给DeepSeek。统一执行依据为DEEPSEEK_COMPLETE_ROADMAP_WORLD_CAREER_V2.md：先通过MATCH-LEDGER-01的R7—R13整改门槛，再按G1—G6完成实际位置竞争、全员发展、需求驱动世界市场、国家队人才池竞争及可玩的页面/像素故事。不得因下一阶段规划而把前置整改标为完成；不提交或发布。

- 依据：DEEPSEEK_REVIEW_ROUND3_20261019.md；基准 `main / 2d54b7aa2f915e6c1b3968a18d13212618963d22`，保留全部未提交工作。
- 范围：盘点姓名/外观/能力写入者；以 `season.playerData[playerId]` 为当前资料权威；个性化与 God Mode 走同一按稳定ID的资料写入口；普通 prepare/open/save 不得用过期 MyCareer 副本反向覆盖；训练/赛后/跨季成长走明确提交路径；保留旧档、旅程、经验、故事与历史快照；不拆表、不重编号、不全量重算、不改回传AI/评分/抽卡。
- 先建失败回归，再最小修复；页面接线改动后构建并用生成存档做编辑—进场/替补—国家队—刷新检查。
- 写入者盘点：个性化 `src.jsx:customizePlayer`、God Mode `god-mode.mjs:editPlayer`、专项训练 `career-journey.mjs:trainJourney`、比赛成长 `finishJourneyMatch`、跨季成长 `aging.mjs:advanceSeasonAges`、建人 `createCareerPlayer`+prepare、旧档恢复/普通 prepare。
- 实现：`identity.mjs` 新增 `updatePlayerProfile`（稳定ID、字段校验、原子写入、主档→副本镜像）与 `commitCareerGrowth`（只提交能力/训练重点）；`ensureIdentity`/`carryIdentity` 改为已有主档优先，只有新主角初始化或缺失旧字段时才由副本补；训练/赛后/年度训练分别接入显式提交；个性化与 God Mode 都调用同一写入口。
- 实测：`node --test player-profile-authority.test.mjs` 9/9；包含职业市场、身份、事件、职业旅程、成长、God Mode 等 199/199 Node 专项；`node test.mjs` 通过；`node season-loop.test.mjs` 通过；`npm run build` 通过。浏览器：新增 `player-profile-authority.spec.mjs` 1/1（主档旧副本加载→个性化改名→刷新→国家队→返回并进场）；职业旅程4项、国家队3项、世界身份1项、外观2项浏览器回归通过。
- 未验证：完整 Playwright、真实用户存档、跨标签页冲突、结算幂等和物理存储；未执行拆表/重编号/全量统计重算/发布。

## MATCH-LEDGER-01：统一结算与可追溯履历（2026-10-19，DeepSeek）

- 依据：DEEPSEEK_NEXT_MATCH_LEDGER_20261019.md；基准 `main / 2d54b7aa2f915e6c1b3968a18d13212618963d22`，保留全部未提交工作。
- 阶段0 R5：`identity.mjs:updateCareerProfile` 成为个性化专用业务命令；先校验姓名/外观/号码，再按 roster+squad+同队球员计算冲突，冲突队友按最小可用 1–99 号原子改号；号码耗尽抛错且状态不变。`updatePlayerProfile` 仍拒绝通用编辑静默改号。页面显示真实改号结果，异常不再冒泡。
- 阶段0 R6：门将综合先展开到四个分项，再统一校验最终值；0、100、1.5、NaN 被拒绝且无部分写入；显式分项优先，综合值由四分项重算。
- 阶段1：新增 `match-ledger.mjs`（固定 `matchIdentity`、结果合同、摘要、收据）；`createMatchRecord` 复用同一编号公式；路径表写入 MATCH_LEDGER.md。
- 阶段2：`season.matchSettlements` 记录每场结算；`completeWeek`/`completeCupMatch`、`finishCurrentMatch`、`finishEventSimulation` 支持固定 matchId 预检查；同 ID 同内容直接返回，异内容拒绝。收据随归档、跨季和备份往返。国家队与青训保留各自既有防重。
- 阶段3：`history.mjs:playerCareerLedger` 汇总当前/归档/国家队/青训，按当场 teamId 分段，保留旧累计基线并标注明细缺口，不把 unknown 当 0。
- 阶段4：`stats.jsx` 历史档案新增“可追溯履历”范围切换、赛季与效力球队、最近比赛与有报告时的复盘入口；复用现有像素界面与样式体系。
- 实测：`match-ledger.test.mjs` 7/7；`player-career-ledger.test.mjs` 4/4；`player-profile-authority.test.mjs` 13/13；`node test.mjs`、`node season-loop.test.mjs`、`npm run build` 通过；`browser-tests/career-ledger.spec.mjs` 1/1、`browser-tests/player-profile-authority.spec.mjs` 2/2。未跑完整 Playwright、未用真实存档、未验证故障注入/跨标签并发/动态回放；未提交/推送/部署。
- 遗留：低层 `completeWeek` 非克隆调用在中途异常时可能留下半轮内存累计；后台国家队/青训尚未统一为收据查询；性能测量（单场保存、整季、读档、档案查询、备份大小）未记录。

## MATCH-LEDGER-01 P0 整改 R7–R13（2026-10-19 第二轮，DeepSeek）

- 依据：CODEX_MATCH_LEDGER_REVIEW_20261019.md；未提交、未推送、未部署、未碰真实存档。
- R7：`makeMatch`/事件模拟 session 绑定赛前 `matchId`、双方与 week/phase/round；结算只用该上下文；低层首次提交核对当前场次。回归覆盖错位编号拒绝与同一对象重试。
- R8：结算指纹覆盖全部个人累计字段、出场边界、球队统计、事件、点球与胜者；单改传球/抢断/扑救/出场秒数/换人分钟/射门均拒绝，行序变化不误报。
- R9：`completeWeek`/`completeCupMatch` 改为整轮工作副本提交；第二联赛注入失败时 week/results/players/收据不变。保存失败保留 `pendingSave`，页面提供“重试保存”，浏览器注入 IndexedDB 与 localStorage 不可用后重试只保存同一结果一次。
- R10：取消收据裁剪；查询当前与归档收据；4001 条阈值与归档转存后仍防重。
- R11：导入校验当前/归档收据版本、结构、比分、摘要、唯一 ID；损坏数据拒绝，旧档缺失兼容。
- R12：`playerCareerLedger` 保留全部 `LEDGER_FIELDS`，缺失为 null；当前/归档逐字段对账。
- R13：`HistoricalLeaders` 接收真实 `career`；非空国家队/青训浏览器样本、比赛展开与报告入口通过。
- 实测：`match-ledger.test.mjs` 11/11、`player-career-ledger.test.mjs` 7/7、`player-profile-authority.test.mjs` 13/13；`career-ledger.spec.mjs`、`settlement-retry.spec.mjs`、`player-profile-authority.spec.mjs` 浏览器通过；`npm run build` 通过。`appearance-studio-render.test.mjs` 20/24 仍失败，精灵文件在本轮前已是未提交状态，本轮未改，单列待查。
- R14：新增统一 `advanceBlocked()`，长期模拟、直接模拟、事件模拟、国家队、青训、下一场和跨季入口都在业务层检查；`locked` 合并保存失败/待保存。浏览器故障注入后“不进场模拟”禁用，恢复存储只保存原赛果，week 0→1。
- R15：实战与国家队早退分支在检查前构造本人/替补行、球队统计与进球事件，不再只比比分；`bicycles` 等实际累计字段纳入。改事件、动作人、乌龙、bicycles 均拒绝。
- R16：区分 v1/8、v1/32、v2/32 三类收据；v1/32 用上一轮字段集比较，v1/8 受限比较，v2 用当前完整契约。导入、重试、继续杯赛、跨季兼容通过。
- G1–G6：按路线图“有核心门槛失败不得进入新功能”及“完成后交回 Codex 复审”的要求未启动；未把新升级标为已开始。

## ID-02 补充验收 R1/R2（2026-10-19 第二轮，DeepSeek）

- 依据：DEEPSEEK_REVIEW_20261019.md。基准 `main / 2d54b7aa2f915e6c1b3968a18d13212618963d22`；开始前 101 项未提交/未跟踪改动，只改本轮相关文件。
- R1：`aerial()` 空中重新出球时同步动作人ID，覆盖传中头球、倒钩、对方来球后空中射门、换人前出球来源；事件ID/姓名/个人统计/助攻一致。
- R2：`resultGoalEvents` 对显式乌龙优先按当场标签还原受益队；缺少 teamIds 时不得退回动作方球队，证据不足保留未知。
- 导入语义：`ownGoal` 必须是布尔；有完整参赛证据时动作者与受益方必须不同；乌龙不记普通个人进球/助攻；点球大战与常规进球分开。
- 旧姓名测试：test.mjs 改为人物主档姓名优先；保留旧档兼容与缓存不覆盖身份表的独立断言。
- 浏览器：生成数据的回归覆盖乌龙球归队/标识、个人统计、复盘打开和刷新恢复；不碰用户真实存档。
- 本轮不执行：全量迁移、重编号、同名合并、回传AI调整、抽卡/评分修改、提交推送或部署。
- R1 实测：新增4项，修复前失败、修复后通过；`aerial()` 同步 `sourcePlayerId`，事件ID/姓名/头球或倒钩统计/助攻与换人前来源一致。
- R2 实测：新增3项（缺 teamIds、客场/改名换人、无证据未知），修复前误归动作方，修复后按当场标签归受益队或保留未知。
- 导入语义：新增6项覆盖非布尔 `ownGoal`、同队乌龙、乌龙计入个人进球、结果级 goalEvents 非布尔/同队/带助攻；全部由存档校验拒绝。点球大战不进比分与普通进球事件。
- 旧姓名：test.mjs 改为 `playerData` 主档姓名“测试球员”、`season.names` 留“旧位置缓存”；新增“无主档时缓存才作回退”独立断言。test.mjs 全通过。
- 实际测试：整套 Node 专项 183/183；`node test.mjs` 通过；`node season-loop.test.mjs` 通过；`npm run build` 通过；浏览器 `browser-tests/own-goal-id02.spec.mjs` 1/1 通过并生成 `test-results/own-goal-desktop.png`。未跑完整 Playwright 套件；未验证真实用户存档；未提交/推送/部署。
- 剩余：ID-04 回传AI仍待独立评估；ID-01 全量身份验收、ID-03 双写收敛、全库/发布 QA 仍未开始。

## ID-02 第三轮 R3/R4（2026-10-19，DeepSeek）

- 依据：Codex 第二轮复审。R3：换人前传中、替补后头球时，`aerial()` 的完成传球/完成传中/向前传球仍写 `this.stats[槽位]`，会记到新上场者。R4：`validNationalCareer` 不校验履历内部 `report`，国家队报告可绕过 `ownGoal` 导入规则。
- R3 修复：完成传中三个字段改用 `statLine(b.source,b.sourcePlayerId)`，与助攻/关键传球一致；头球者的新 `sourcePlayerId` 仍在完成旧传中统计之后写入。下场者的传球/传中尝试（换人前已记录）与成功、向前传球、关键传球、助攻全部保留，替补在未触球时相关计数为 0。
- R4 修复：在职业存档校验中复用现有 `report` 结构/事件校验，覆盖 `player.nationalCareer.history[].report`；不要求国家队 ID 属于俱乐部。新增：显式乌龙报告的人物引用、逐球受益侧与 `report.score` 对账；非布尔/同队/非法人物/错误受益侧/错误比分均拒绝。`report` 缺失或旧缺字段报告仍可恢复。
- 实测：`node --test event-attribution.test.mjs` 21/21（R3 1项、R4 1项新增）；整套 Node 专项 185/185；`node test.mjs` 通过；`node season-loop.test.mjs` 通过；`npm run build` 通过。浏览器 `own-goal-id02.spec.mjs` 仍为生成数据 1/1；未验证动态进球回放播放/镜头/暂停，只验证静态复盘与回放元数据单元测试。
- 未做：回传AI、物理迁移、重编号、真实存档批量修复、提交/推送/部署。

## ID-02 第一轮执行记录（2026-10-19，DeepSeek）

- 基准：`main` / `2d54b7aa2f915e6c1b3968a18d13212618963d22`；开工时 43 个已跟踪修改、55 个未跟踪文件。只改本任务相关文件，不执行暂存、提交、重置、清理或覆盖。
- 用户本次要求：完成阶段 A 现状复核并推进 ID-02；允许生成样本与专项测试、经证据确认的事件生成/归属/展示/校验代码和交接文档；不迁移人物数据库、不改比赛概率、不发布。
- 复现：固定种子 17、36（`Math.random` xorshift）可稳定出现中国队回传进入本方球门；事件动作方球队=0、受益队=1，旧格式把两者混为 `team`。
- 根因：`engine.mjs:goal()` 用 `eventRecord` 的动作方球队写 `team`，没有受益队与乌龙球字段。修复后事件格式为 `team=受益队索引`、`playerId=最后触球者`、`ownGoal:true`；动作者不增加个人进球，比分、审计、结果展示与导入校验使用同一语义。
- 实测：`node --test event-attribution.test.mjs` 4/4；整套 Node 专项（含身份、国家队、职业旅程、升级、结果展示、新闻、模拟、战术、外观等）164/164；`node season-loop.test.mjs` 通过；`npm run build` 通过，dist/app.js 含新语义；`http://127.0.0.1:4177/` 返回 200。`node test.mjs` 在“旧 names 缓存应压过 playerData 姓名”的第 101 行失败；该断言与工作区既有的 playerRows 姓名优先级改动冲突（`league.mjs` 相对 HEAD 已被其他未提交工作修改），不属于 ID-02，未为其改测试或回退代码。完整 `npm test` 因此未通过；Playwright 未跑；未验证真实用户存档，未提交/推送/部署。
- 已知遗留：120 场固定种子国家队动作比赛中 4 场出现本方回传进自家球门（3.3%），全部来自危险状态下选择身后且贴近球门线的出球点。该行为属于独立的 AI 出球选择问题，本轮未改比赛概率；建议另列任务，用受控样本决定是否加“禁区内回传保护”。
- 验收：同一事件记录受益队并带乌龙球标记；动作者个人进球统计为 0；赛后展示、新闻、审计、导出再导入一致；正常进球、主客场、换人、国家队结算回归通过。
- 保护：不修改任何用户浏览器存档；新测试全部使用生成样本。

## 下一位助手的推荐顺序

1. Codex 复审 ID-03 第一阶段：确认主档权威、统一资料写入口、成长提交方向，以及旧副本不能在 prepare/open/save 时回滚新资料。
2. 若通过，再单独立项评估 ID-03 下一步（统一结算/统计分段或跨标签页冲突），一次只开展一个大工程；不顺手拆表或全量重算。
3. ID-04 单独评估回传AI：保留种子17/36/56/106样本，用受控对照决定是否加禁区回传保护，不能顺手改比赛概率。
4. 如需确认动态乌龙回放，用生成数据实际播放并核对镜头/暂停；静态复盘截图不算动态回放验收。
5. 发布前再跑完整 Playwright、全库回归和用户真实存档的只读体验检查；未获明确授权不提交、推送或部署。

## 每次任务交接填写

- 任务 ID、负责人、开始时分支与完整提交编号。
- 用户本次要求、允许修改范围、明确不包含的事项。
- 修改文件；是否存在其他助手尚未提交的改动。
- 实际执行的测试命令、结果和时间；失败复现；未验证事项。
- 文档更新、需要人工验收的步骤、下一位助手应做的具体动作。

暂停或失败不填“完成”。未分配事项不能默认为另一个助手正在处理。





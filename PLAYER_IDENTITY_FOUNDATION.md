# 球员身份与存档基础规范 v1

状态：2026-10-19，第一阶段基础工作。本文区分已实现、现状兼容和后续目标。未迁移数据库，未重编号，未合并或重命名用户存档人物。

## 1. 已核验的当前架构

- 世界球员主要保存在season.playerData；外部国家队人物暂存season.nationalWorld.players。统一只读入口是player-registry.mjs的resolveWorldPlayer，world-player-identity.mjs保留兼容导出。查不到返回null，不生成替代人物。
- 当前ID包括球队/位置前缀，是历史创建方式，不代表当前归属。禁止解析ID得到当前球队、位置、年龄或姓名。本轮保留所有ID；后续新编号切换需单独迁移规格。
- season.world各联赛和cup在运行时引用主世界身份表；备份会去掉重复身份表。不能把这些共享引用误认为多个独立人物。
- MyCareer player对象与season.playerData[player.id]仍有双份name/appearance/attributes；ensureIdentity等负责同步。这是待收敛风险，本轮通过警告检测，不声称已消除双写。
- 游戏已使用IndexedDB：pixel-pitch-save-data，save-data与season-archives；有写入队列、归档拆分、压缩localStorage回退和JSON导入导出。本轮没有新增另一套保存机制。当前仍有整档快照保存，不等同于逐球员增量数据库。
- 国家队NPC只对玩家实际进行的比赛累计个人统计；后台其他国家比赛仍只有球队赛果。青训部分未注册人物的ID为null，必须标为历史不完整，不套用成年队人物。
- 当前没有通用的playerStatSegments，也没有统一的事务级比赛结算服务。careerStats、联赛/杯赛players、nationalCareer和internationalStats具有各自范围，不能视作可自由替换的同一总量。

## 2. 身份读写入口清单

| 流程 | 实际入口 | 读取/写入范围 | 当前风险与边界 |
|---|---|---|---|
| 初始世界 | league.mjs:createSeason、identity.mjs:createIdentity | 主身份表、各队首发编号 | 创建时的编号不再用于推断当前归属 |
| 青训补员 | identity.mjs:generateProspect、football-life.mjs:ensureFootballLife | 新身份、合同和名单 | 使用姓名库，不能拆已有本人姓名 |
| 主角建立 | career.mjs:createCareerPlayer、career-journey.mjs:initializeJourney | 主角副本及独立注册身份 | 后续仍需收敛主角镜像 |
| 旧档准备 | league.mjs:prepareSeason、identity.mjs:ensureIdentity | 补默认资料、旧字段迁移、同步主角 | 会修改输入，不得用于只读审查 |
| 当前查询 | player-registry.mjs:resolveWorldPlayer、identity.mjs:activePlayers | 统一按编号查询；后者为俱乐部名单查询 | 球员不存在不能生成同位置替代者 |
| 阵容/恢复轮换 | football-life.mjs:selectStarter、recovery.mjs:prepareFixtureTeams | rosterIds、恢复与临时首发 | 位置只是槽位，不是身份 |
| 俱乐部进场 | src.jsx:makeMatch | 按本场双方生成ID、名字、号码、能力、外观数组 | 数组必须按同一批人构造 |
| 替补进场 | career-journey.mjs:enterJourneyMatch | 出场者编号、姓名、号码、外观、能力、上下场事实 | 替补前事件保留原ID；刚修复旧先发外观残留 |
| 青训比赛 | career-journey.mjs:createYouthMatch/finishYouthMatch | 青训报告、成长与故事 | 不计成年职业统计；未注册者明确缺失 |
| 国家队名单/进场 | world-player-identity.mjs:nationalRoster、international-career.mjs:createNationalMatch | 当期成员编号、国家队号码、本场阵容 | 国家队安排不能覆盖俱乐部归属和号码 |
| 动作事件/复盘 | engine.mjs:eventRecord/report | 事件球员ID、姓名快照、本场双方和终场数组、换人记录 | 先读事件ID，不能用终场位置倒推本人 |
| 直接/观看模拟 | live-simulation.mjs；simulation.mjs:EventMatch | 前者运行动作比赛，后者后台区域模拟 | 两种实现，不能误称已统一统计引擎 |
| 联赛/杯赛结算 | league.mjs:createMatchRecord/completeWeek、cup.mjs:completeCupMatch | 本场个人行、联赛/杯赛统计、球队结果 | 主场顺序不等于玩家侧顺序 |
| 主角结算 | src.jsx:finishCurrentMatch、career.mjs:finishCareerMatch | 主角成长、职业统计、生涯历史 | 本轮未重写结算；旧的重复点击保护不等于事务提交 |
| 国家队结算 | international-career.mjs:settleNationalFixture、world-player-identity.mjs:recordWorldNationalMatch、national-progression.mjs:applyNationalEffects | 主角国家队、NPC国际数据、恢复负荷 | 使用比赛编号防重；不增加俱乐部进球 |
| 新闻/赛后 | result-info.mjs:matchGoalEvents/resultGoalEvents、ui.jsx:Postmatch、news.mjs | 已结算事实与比赛快照 | 旧报告有多层回退，无法还原者不能猜 |
| 编辑 | god-mode.mjs:editPlayer/editPlayerStats、src.jsx:customizePlayer | 本人当前资料、主角镜像、编辑日志 | 用户编辑过的资料不能被默认库覆盖 |
| 转会/租借/续约 | football-life.mjs:movePlayer/renewContract、transfers.mjs、identity.mjs:carryIdentity | 当前合同、双方名单、历史转会 | 历史match.teamId不随当前球队变动 |
| 跨季/退役 | src.jsx:startNextSeason、identity.mjs:carryIdentity、aging.mjs、world.mjs | 老身份继承、成长退役、新人补充 | 新人不能继承退役者编号和统计 |
| 卡牌 | dream-team.mjs:dreamMatchOptions、src.jsx:finishDreamMatch | 卡牌ID、真人来源、阵容、模式结算 | 与生涯世界ID不同；不能把卡牌版本当作生涯人物 |
| 持久化 | save-slots.mjs:saveSaveDataAsync/loadSaveDataAsync/exportBackup/importBackup | IndexedDB快照与归档、旧档准备 | importBackup可能校验/补全，诊断CLI故意不调用 |

## 3. 权威来源与兼容规则

| 字段 | 当前权威/写入口 | 兼容与目标 |
|---|---|---|
| 当前人物姓名、外观、能力 | `season.playerData[playerId]` 主档；`identity.mjs:updatePlayerProfile` 统一写入；`career` 为兼容镜像 | 普通 prepare/open/save 主档优先；训练/成长经 `commitCareerGrowth`；旧档无主档字段时才由副本补 |
| 当前俱乐部/可用状态 | 本人teamId/freeAgent/retired，与squadIds/rosterIds共同核验 | 国家队不改这些字段；租借/合同沿用现有业务，不新增第二套 |
| 首发槽位 | rosterIds | 仅决定本场位置，不允许当永久主键 |
| 主角控制 | player.id + 本场playerIds/careerIndex | careerIndex是控制槽位，不能当本人编号 |
| 国家队本期号码与身份 | nationalWorld.squads成员引用 | number在名单视图中与clubNumber分开 |
| 本场姓名、球队、号码 | 当场个人行、report快照、事件 | 不能从球员当前球队回填历史；姓名改动不改旧快照 |
| 职业统计 | 现有联赛/杯赛/国家队各自记录 | 不全量重建，不把被裁剪的历史视作完整原始账本 |
| 故事关系 | cast等对象中的人物编号 | 文案仅展示，不按姓名找搭档或对手 |
| 原始外观 | 本人appearance | 球衣为本场装备，场上动画状态是临时数据 |

### 3.1 当前资料写入口与镜像方向（ID-03 第一阶段）

- 已有主档时，`season.playerData[playerId]` 的姓名、外观、能力、年龄、潜力、训练重点为当前资料权威；`career` 对象继续保存旅程、XP、故事、统计等职业字段，并作为兼容镜像。
- `identity.mjs:updatePlayerProfile(season,playerId,patch,{career})` 是个性化与 God Mode 共用的资料写入口：按稳定ID定位，只提交允许字段，先校验后原子写入，成功后镜像到 career。它不处理队伍/位置/名单交换、历史快照或国家队号码。
- `identity.mjs:commitCareerGrowth(season,career)` 是训练/比赛成长的显式反向提交：只把能力和训练重点写回主档，避免用“主档优先”吞掉成长。
- `ensureIdentity` / `carryIdentity` 在普通准备、打开、保存、跨季时执行主档→副本同步；只有新主角首次注册或主档确实缺少字段时，才由副本补。旧副本不再无条件覆盖完整主档。

所有读取失败均不得静默重新生成本人。新字段/API不得通过解析p:球队:位置等字符串推断身份。旧格式转换必须在明确迁移入口中进行。



## 4. 六类操作的更新和验收合同

| 操作 | 必须改变 | 不允许改变 | 验证 |
|---|---|---|---|
| 改名/外观 | 当前本人及现有主角兼容镜像 | ID、过去比赛姓名/形象快照 | 编辑后进场一致，旧报告逐字段不变 |
| 换人 | 当前槽位的ID、姓名、外观、号码、能力、出场边界 | 下场者此前事件、传球助攻来源 | 实际分钟对账、主角外观一致、早先事件仍指原人 |
| 转会/租借 | 有效职业关系、原/新队名单、合同和转会记录 | 本人ID、国家代表身份、过去比赛代表队 | 当前名单一致，历史事件仍归原队 |
| 国家队报到 | 本期名单、角色、国家队号码 | 俱乐部号码/关系、俱乐部进球 | 本人查询一致，两个范围统计分开 |
| 结算 | 比赛结果、相关统计和负荷、必要进度 | 同一matchId重复产生额外贡献 | 重复执行状态不变；客户端旧保护和未来事务化须区分 |
| 跨季/退役 | 日期、成长、当季范围、退役状态、新人 | 老人ID、已有荣誉与历史 | 原人可追溯，新人独立身份，备份往返一致 |

未来统一结算必须明确每项副作用；本轮不声称俱乐部completeWeek已经幂等。检查器能发现结果集重复ID，不能仅凭静态存档证明每次累计都正确。

## 5. 只读检查器与使用

- identity-audit.mjs：auditWorldIdentity(season,career)，输入不被修改；输出version/counts/summary/issues。
- 每条issue含severity、code、path、message、playerIds，可追到具体记录。
- error：有直接证据的编号冲突、名单错误、当场事件错人错队、出场时间或比分冲突。
- warning：历史身份或名单缺失、旧格式无编号、主角镜像不同步。须人工/迁移逻辑确定，不能自动编造修复。
- info：不同编号同名，是正常提醒，不视作损坏。
- 明确ownGoal:true的诊断样本区分动作发生者与受益球队；动作比赛进球现使用正式格式：`team`=受益队索引，`playerId`=最后触球者，`ownGoal:true` 表示动作者所属球队与受益队不同。检查器、结果展示、新闻与存档校验使用同一语义。旧报告没有该字段时仍按原证据判断，不批量补标。

运行：npm run audit:identity -- "导出的JSON备份绝对路径"
CLI直接读取标准导出JSON，支持slots、{season,player}、单season；不读取浏览器、不调用prepareSeason/importBackup、不覆盖原文件。压缩localStorage字符串应先通过游戏导出JSON。退出0表示未发现确定错误（仍可能有warning），1表示确定错误，2表示输入或执行失败。它不是存档导入校验的替代品。

覆盖当前联赛、其他联赛、杯赛、内嵌历史归档、主角职业/青训/国家队历史。没有加载浏览器另存但尚未导出的归档；没有完整检查卡牌版本语义、合同预算、所有统计累计与未公开的旧版本。未保存的个人统计不从聚合比分臆造。

## 6. 固定测试样本与验证范围

源样本构造器：test-fixtures/identity-worlds.mjs，固定种子31；不包含真实用户资料。覆盖普通旧生涯、青训转职业、自定义外观/姓名、转会、国家队窗口、同名不同人、历史证据不足、缺失人物。生成到outputs/identity-foundation的JSON只供诊断，部分故意损坏/不完整的样本不应导入正式游戏。

identity-audit.test.mjs验证检查不修改输入、问题分级、具体编号/路径、旧换人记录、乌龙球诊断、重复结算标记、国家队实际结算及重复执行、转会改名、跨季、备份恢复和CLI不改文件。career-journey.test.mjs和player-matching.test.mjs继续验证实际替补外观和进球快照。event-attribution.test.mjs新增正常进球、发动机乌龙球、固定种子17国家队全链与实战俱乐部存档往返，锁定受益队/动作人/个人统计/审计/备份的一致语义。

## 7. 当前验收状态（2026-10-19）

本阶段尚未完成整体验收。ID-01的完整身份工程仍需继续；ID-02第一轮修复受益队/`ownGoal`，第二轮补齐R1（空中触球动作人ID）与R2（缺`teamIds`报告的受益队回退），第三轮补齐R3（换人后完成传中统计归原人）与R4（国家队履历`report`复用导入校验）。固定种子17、36保留：事件记录受益队与`ownGoal`，动作者不记个人进球，展示、新闻、审计、导出再导入一致；`event-attribution.test.mjs` 21项、整套Node专项199项、`test.mjs`、整季回归、构建和1项生成数据浏览器回归通过。未跑完整Playwright套件，动态进球回放未验收，未用用户真实存档，未提交或发布。剩余风险：危险状态下选择贴近本方球门线的身后出球点仍会造成回传乌龙（120场固定样本4次），需另列ID-04决定是否增加出球保护；ID-03第一阶段已建立主档权威与统一资料写入口：个性化/God Mode 走 `updatePlayerProfile`，训练/比赛成长走 `commitCareerGrowth`，普通 prepare/open/save 主档→副本同步；9项资料权威、199项Node和浏览器编辑链通过。旧位置回退、分散结算与统计范围风险仍在。

## 7.1 阶段 A 复核补充（2026-10-19，ID-02）

- 入口对照：`player-registry.mjs:resolveWorldPlayer` 仍是统一只读查询；`international-career.mjs:createNationalMatch` 仍固定把玩家国家放在引擎 team 0；`engine.mjs:eventRecord/report` 是动作比赛事件的权威出口；`result-info.mjs:matchGoalEvents/resultGoalEvents`、`save-slots.mjs` 的 report/result 校验、`identity-audit.mjs:checkMatch` 是四个事件消费端。逐项与 §2、§3 表一致。
- 与旧交接的差异：旧记录“13 项中 11 通过、2 失败”不代表当前代码；当前身份专项 28/28 通过。实际遗留是事件语义错误，不是审计器随机失败或旧档随机问题。
- 最小失败样本：`event-attribution.test.mjs` 的固定种子 17 用例。构造链路与实机一致：`chooseNation → prepareSeason → openNationalWindow/respondNationalCallup → nextNationalFixture → createNationalMatch({season}) → simulateMatchWithoutEntry`，随机源用 xorshift(17)，结束后恢复 `Math.random`。
- 复现结果：中国队球员 `p:osasuna:2` 在第 51 分钟回传进入本方球门；旧代码事件 `team:0`、无 `ownGoal`，受益队实际为 1；修复后 `team:1, ownGoal:true`，动作者进球为 0。
- 运行命令：`node --test event-attribution.test.mjs`；相关回归 `node --test identity-audit.test.mjs player-matching.test.mjs world-player-identity.test.mjs international-career.test.mjs`；整季对账 `node season-loop.test.mjs`。
- 结论：根因落在 `engine.mjs:goal()` 与 `eventRecord` 的球队语义，可由生产代码和数据直接解释；不以“可能是旧档”结束。
- 补充（第二轮）：R1 空中触球动作人ID、R2 缺 `teamIds` 的乌龙回退、`ownGoal` 导入语义、复盘/回放展示和生成数据浏览器回归已加入 `event-attribution.test.mjs` 与 `browser-tests/own-goal-id02.spec.mjs`；运行 `node --test event-attribution.test.mjs` 与 `npx playwright test browser-tests/own-goal-id02.spec.mjs`。
- 补充（第三轮）：R3 换人后完成传中统计归原人；R4 国家队履历报告复用存档报告校验。运行 `node --test event-attribution.test.mjs`；动态进球回放播放仍未验收。

## 8. 开始下一阶段的门槛

1. 入口清单和权威来源表可对应到代码；新增写入口必须更新此表。
2. 干净样本没有error；同名仅info，证据不足仅warning，故意损坏准确报错。
3. 检查过程不修改输入；真实用户文件无授权不批量重命名或合并。
4. 改名、换人、转会、国家队、跨季和恢复的固定回归通过。
5. 清楚记录尚未消除的主角双写、旧位置回退、分散结算与统计范围风险，再制定后续最小改造。

不在本阶段：逐球员数据库迁移、UUID全量改号、完整国家队个人后台模拟、大规模UI、全赛季性能承诺。





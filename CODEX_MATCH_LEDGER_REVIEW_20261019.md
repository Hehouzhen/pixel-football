# MATCH-LEDGER-01 独立复审：先修核心正确性

日期：2026-10-19。审查对象：DeepSeek本轮本机工作区交付。Codex本轮只读检查游戏代码、运行生成样本和测试、写本文；未修改游戏实现、真实存档或发布。

## 结论

阶段0的R5/R6可以在专项范围内认可；MATCH-LEDGER-01阶段1—4已有代码，但核心验收不通过。不是仅剩扩大测试覆盖：已独立复现幂等、履历、导入和半轮结算错误。先修下列问题，不增加新功能、不发布。

## 本轮独立验证

- match-ledger.test.mjs、player-career-ledger.test.mjs、player-profile-authority.test.mjs：24/24通过。
- 事件归属、身份审计、姓名匹配、世界身份：50/50通过。
- appearance-studio-render.test.mjs：失败，实际20，期望24，与DeepSeek所报一致。未使用该轮修改前的独立快照运行，不能仅凭“该文件没改”证明它一定是既有失败。
- 以下反例均使用生成数据，不使用用户存档。没有重跑完整npm test、test.mjs、整季、构建或浏览器套件；DeepSeek报告的那些通过结果不标为本轮Codex独立执行。

## R7 [P1] 进场比赛没有在开赛前绑定固定编号

位置：src.jsx:218 makeMatch、305 finishCurrentMatch；241 finishEventSimulation。long-simulation.mjs:18也在engine.run之后才生成ID。

问题：makeMatch没有把固定matchId及赛程上下文绑定到比赛；finishCurrentMatch每次从当前week/杯赛阶段重新推导。第一次结算推进后，重试旧比赛会获得下一场的编号，旧收据自然查不到。finishEventSimulation使用旧session.before查询收据，也不能证明当前已提交状态没有更改。

独立反例模拟finishCurrentMatch使用的同一顺序：结算首轮后重新从currentFixture/current week计算编号，再提交旧结果，得到：

```json
{"beforeWeek":1,"afterWeek":2,"oldOpponent":"nottinghamforest","newFixture":["leeds","arsenal"],"accepted":true}
```

这是旧结果被下一场接受的调用链反例，不声称已用浏览器双击触发；现有finished/session按钮保护会减少触发机会，但不能替代固定身份和可重试合同。

最小修复：启动比赛/模拟时就保存固定ID、双方及赛程前提；重试只用原上下文。低层首次提交也要检查固定ID与目标场次一致，不能只在“已有收据”分支检查。统一提交边界从当前权威状态检查旧收据。将同一比赛对象再次结算的实际入口列为回归，而非只给低层函数手动传同一个ID。

## R8 [P1] “不同球员数据会冲突”的摘要不完整

位置：match-ledger.mjs:67 playerSummary、136 assertSettlementRetry；league.mjs:84、cup.mjs:95。

问题：人物摘要仅包含ID、球队、进球、助攻、首发、下场时间。成功传球、抢断、射门、扑救、实际上场时间等均未比较；重试检查也不比较点球大战结果。缺失字段默认0进一步混淆未知和实测零。

独立反例：完成一场生成比赛，固定ID/比分/进球不变，把第一个人的passesCompleted增加100后重试，仍接受为已完成，不报冲突。

最小修复：规范化所有会影响结算的业务事实后统一比较，至少覆盖全部参与累计的个人与球队字段、出场边界、乌龙/助攻归属、点球大战和胜者。无关展示时间及参赛行顺序不参与。不要新增多个互相不同的摘要规则；可用明确字段的规范化结构直接比较，避免把正确性只寄托于32位散列。

验收：分别单改传球、抢断、扑救、playingSeconds、换人边界、点球比分/胜者，全部拒绝且原状态不变；只改变对象键序和参赛行顺序仍可安全重试。

## R9 [P1] 半轮内存写入已实际复现，持久化失败重试也未闭合

位置：league.mjs:84 completeWeek；src.jsx:174—175、203—204、246、255—256。

向第二个联赛spain.results.push注入抛错，在同一生成赛季调用completeWeek(null)后：

```json
{"error":"injected second league failure","week":0,"ownLeagueResults":8,"englandPlayerCount":99,"receipts":0}
```

前一个联赛已写赛果和统计，week没推进、收据没写。DeepSeek承认的低层风险属实；外层clone能保护原输入，但不等于有完整的提交协议。

另外，代码检查确认storeSeason/storeCareer先更新内存引用和界面再保存；persist捕获失败并返回false。长期模拟虽会暂停，但内存已推进，本次result只在局部变量中，没有明确的待重试结果槽。再次开始按已推进的seasonRef寻找下一场，不能据此声称“失败后保留同一结果并重试”。此部分未执行真实IndexedDB故障注入，不能标为浏览器验证通过。

最小修复：以共用提交边界在工作副本完成整个批次，全部成功后统一发布状态；保存失败保留固定结果、基线版本与待重试状态，禁止推进下一场或重新抽结果。若低层保留可变实现，确保所有正式入口只能经这个边界调用，明确低层非原子契约并完整测到外层。不必给每个底层函数重复clone整季。

验收：累计中途失败、事务abort、存储不可用分别注入；对账赛果、全部累计、财政、恢复、新闻、成长、指针与收据。点击重试保存同一赛果只生效一次；刷新后的行为明确，不能靠内存状态声称已保存。

## R10 [P1] 收据裁剪使长期防重失效

位置：match-ledger.mjs:6、90 findSettlement、95 pruneReceipts。

独立生成4001条收据后，m0已查不到；再recordSettlement相同m0返回status:'new'。findSettlement只查当前matchSettlements，不查询归档。归档中保存了一份数据并不能自动提供历史防重。

最小修复：保留可查询的历史结算索引/归档查找，或明确拒绝已封存赛季的重放；不能让“收据不在活跃数组”解释成“从未结算”。保持当前存储方式即可，不要求新增数据库。不要只把4000调大。

验收：超过裁剪阈值、多次跨季、归档转存、导出恢复后，最早比赛的同内容重试仍不新增、异内容仍冲突或被明确拒绝。

## R11 [P1] 新收据字段绕过导入校验，损坏备份可导致运行错误

位置：save-slots.mjs importBackup；match-ledger.mjs:90。

生成正常俱乐部存档，把season.matchSettlements设为字符串'broken'，导出再importBackup依然成功；随后findSettlement抛出“...find is not a function”。没有针对matchSettlements的结构验证。

最小修复：对当前及归档收据做有界结构、版本、重复ID、比分、摘要和上下文校验；旧档缺字段允许明确初始化。不能静默丢弃损坏收据以恢复运行，否则绕过防重。冲突收据与既有比赛结果有充分证据时需核对。

验收：字符串、null条目、重复ID、非法摘要/比分、超限集合和归档损坏拒绝；合法旧档缺失、合法新档往返保留。

## R12 [P1] 履历投影丢失大部分真实统计，并误报旧档不完整

位置：history.mjs:119 playerCareerLedger中的playerLine/matchFromResult/sum。

问题：playerLine只保留进球、助攻、分钟等少数字段，后面的LEDGER_FIELDS却包含抢断、射门、扑救、传球等。真实参赛行的这些值被丢掉，sum按缺失0累计，baseline又把差额标为“旧存档缺明细”。

独立构造一场有完整明细的比赛：tackles=7、passesCompleted=33、shots=4；输出三个字段均为0。档案界面会直接显示错误抢断/扑救，不是单纯内部字段未使用。

最小修复：显式保留所有查询支持的参赛统计，缺失值与0分离；只有可证明的历史累计差额才作为基线，不能用投影丢字段解释为旧档缺失。核对本场duration转换、实际出场与完整程度。

验收：每个LEDGER_FIELDS至少有一个非零用例，当前、归档、去重、转会分段都与原参赛行一致；有效新档不应因查询代码丢字段提示历史不完整。

## R13 [P1] 新界面没有拿到主角国家队/青训数据

位置：src.jsx:358 HistoricalLeaders调用；stats.jsx:127、139；history.mjs:120。

问题：主角nationalCareer和journey保存在career对象，而界面HistoricalLeaders只接收season，随后playerCareerLedger(season,row.id)也没有传career。新范围页签因此显示空记录。

同一生成样本中给主角设置一场国家队进球、一场青训进球：按页面当前调用查询得到national=0、youth=0；传入实际career后分别为1、1。浏览器career-ledger用例只断言国家队为空，没有设置非空记录，未覆盖本需求；其名称声称links a match report，但未实际点击复盘。

最小修复：传递正确的本人职业上下文，或查询现有权威记录；不能为接线方便把所有职业数据再复制到playerData。NPC国家队采用已有世界国家队记录，无法提供时明确覆盖边界，不造统计。

验收：浏览器使用确有国家队和青训记录的主角样本，切换时数值、球队和比赛正确；实际点击打开有报告的比赛。增加现役和退役档案，不能只测试空列表。

## 另需校正的完成声明

- normalizeMatchResult目前主要是独立适配函数及单元测试，尚不足以证明所有生产路径已经使用同一合同。需明确哪些字段实际保存、由谁消费，不能以函数存在替代接线验收。
- 后台国家队与青训未统一收据查询层、手机和完整浏览器测试未做，DeepSeek已披露，继续保留为未完成。
- 性能表没有改前对照，不能据此声称无退化；当前数值只按其单次报告保留。
- R5/R6的13项专项通过，号码命令与门将规范化的代码方向符合上轮要求；本轮没有重新运行其浏览器两项，不扩大验收。

## 直接交给DeepSeek的修复顺序

1. 先R7/R8：开赛前固定身份、当前状态统一防重、完整业务结果冲突判断；先补真实入口失败回归。
2. 再R9/R10/R11：结算提交与待重试保存、历史收据可查、导入校验；故障注入后再改完成状态。
3. 再R12/R13：逐字段履历对账、传递正确职业上下文、非空浏览器验收并实际打开报告。
4. 保留现有74项本轮通过用例；修复测试不得只锁定新函数而遗漏调用者。运行相关专项及综合、整季、必要浏览器回归，报告实际范围。渲染20/24失败单列查证，不删断言，不混入本轮数据修复扩大范围。
5. 修正TASKS.md、PROJECT_HANDOFF.md、MATCH_LEDGER.md的状态与路径表，明确核心验收仍不通过，逐条给出修复证据。完成后交回Codex。

本轮任务继续是修复MATCH-LEDGER-01，不开启下一轮功能扩张，不重编号、不拆库、不碰真实存档、不提交推送部署。

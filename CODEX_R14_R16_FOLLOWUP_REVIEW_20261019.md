# R14—R16继续复审：R14通过，R15/R16还需各补一处

日期：2026-10-19。审查当前本机代码；本轮未修改游戏实现、未操作真实存档、未发布。大升级G1—G6尚未开始。

## 独立检查结果

- match-ledger.test.mjs、player-career-ledger.test.mjs、player-profile-authority.test.mjs：33/33通过。
- 浏览器settlement-retry.spec.mjs与career-ledger.spec.mjs：2/2通过。
- R14的直接模拟业务入口已有advanceBlocked保护，页面也将待保存/保存失败纳入locked；故障注入后重试只保存原来一场，week=1。认可本项在已检查范围内的修复。
- R15的低层事件/bicycles反例现在能被拒绝；R16的原8位摘要测试通过。
- 未独立重跑完整npm test、综合test.mjs、整季、构建、所有模式入口或真实用户存档；不将DeepSeek报告的这些结果升级为本轮独立验证。

## 仍未完成：R15实战分支没有传入完整比较事实 [P1]

位置：src.jsx:308 finishCurrentMatch的已有收据早退分支。

代码现在调用assertSettlementRetry，但仅传：score、userTeamId、penalties、winner；没有playerStats、stats、events。该分支之后就返回，因而低层completeWeek/completeCupMatch新加入的统计/事件比较不会执行。国家队分支仍然只查findSettlement后直接返回。

具体情况：同一完成比赛对象已结算，将某个人的进球/传球等统计或动作事件改变而保持比分不变，再提交同一对象；实战早退分支只看比分，所以无法识别冲突。独立调用该分支实际传参形状确认检查通过；这项是代码与检查函数的调用链验证，未声称浏览器界面提供手动篡改结果的按钮。

原有新测试调用的是低层completeWeek并明确传入全部simulation数据，因此会通过，不能证明实战分支正确。事件模拟分支已传统计/事件，这部分可以保留，不必回退。

最小修复：实战与国家队在收据检查前构造其规范化结算事实，重试和首次提交使用同一套本人行、球队统计及事件来源；不能再只传比分。保留主客转换、下场者统计、乌龙与点球独立语义。不要把结果构造复制三遍，也不要改比赛概率。

验收：对同一真实构造的完成对象，经正式结算入口重复提交；相同内容无副作用；单改个人统计、进球事件、乌龙或助攻而比分不变时明确拒绝，原状态不变。既要覆盖实战，也要覆盖国家队；仅测assertSettlementRetry或completeWeek不够。

## 仍未完成：R16遗漏中间版本version 1＋32位摘要 [P1]

位置：match-ledger.mjs:119 isLegacyReceipt、165后的旧格式比较；save-slots.mjs:50版本校验。

上一轮已经生成过version=1且digest/playerDigest为32位的收据，本轮才升version=2。因此现有格式至少包括：v1/8位、v1/32位、v2/32位。

isLegacyReceipt用version===1把前两类都放进8位旧算法分支；随后用digest(legacyPlayerSummary(...))的8位值与32位playerDigest比较，完全相同结果也冲突。

独立反例按上一轮真实32位算法构造：四个盐值散列、上一轮统计字段列表（没有bicycles）、原先的规范化事件和球队统计。生成正常赛季与已完成比赛，将对应收据恢复为这类真实中间格式。导出/导入成功，随后同结果assertSettlementRetry抛出“重复提交的球员数据不一致”。这不是任意损坏摘要的负例。

最小修复：按实际摘要格式区分两类v1记录；有原结果事实时做有证据的适配，缺失时保留“已结算”的安全事实及有限比较。不能统一丢弃收据、重算累计，不能把没有证据的字段声明为已核对。recordSettlement与assertSettlementRetry保持兼容规则一致。

验收矩阵：v1/8位、v1/32位、v2/32位 × 当前/归档 × 有明细/缺明细。相同结果恢复后可继续运行，明确异比分/旧格式可核对的异人物摘要仍拒绝。覆盖原样导入、相同结果重试、继续杯赛、跨季和重复兼容准备。

## 下一步

继续修现有R15/R16，不另起一轮功能扩张。R14不用重写，保留回归即可。完成以上两处及实际入口验证后，按DEEPSEEK_COMPLETE_ROADMAP_WORLD_CAREER_V2.md进入G1/G2：统一位置竞争、接入排阵与全员发展。

交回时列出三类格式样本、实际结算入口测试、运行结果与未覆盖项；更新TASKS.md/PROJECT_HANDOFF.md顶部，避免旧失败声明与新状态混在一起。不提交、推送、部署。

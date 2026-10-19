# DeepSeek 第二轮复审与下一步

日期：2026-10-19；审查者：Codex。本轮未修改游戏实现、未修改用户存档、未发布。

## 结论与已核验进展

可以认可上轮R1/R2的修复：头球/倒钩现在更新动作人ID；缺少teamIds的显式乌龙球报告不再优先使用动作方球队；旧姓名测试已按人物主档优先调整，没有回退生产规则。

Codex本轮实际执行结果：

- `node --test event-attribution.test.mjs identity-audit.test.mjs player-matching.test.mjs world-player-identity.test.mjs`：48/48通过。
- `node test.mjs`：退出0，原第101行姓名基线失败已消除。日志：test-results/codex-review-round2-baseline.log。
- `npx playwright test browser-tests/own-goal-id02.spec.mjs`：1/1通过；查看了生成的own-goal-desktop.png，确认复盘归队和乌龙标识。
- 没有独立重跑DeepSeek报告中的整套183项、完整Playwright、构建与全部真实存档体验。这里不能表述为完整npm test通过。

目前新增两个确定复现。它们主要是仍未覆盖的既有链路，不应全部归因于DeepSeek新引入；但人物数据工程必须处理这些事实一致性问题。

## R3：换人前传中，接头球时成功传球和成功传中仍记给新上场者

优先级：必须修复。位置：engine.mjs:97，aerial中的完成传中分支。

复现流程：3号球员传中；球在空中时该槽位换人，并保留下场者substitutedOut和ball.sourcePlayerId；5号球员头球。

独立运行结果：

```json
{"headed":true,"expectedCredit":"person-3","oldPlayer":{"passes":0,"crosses":0},"newPlayer":{"passes":1,"crosses":1}}
```

根因：该分支仍直接写`this.stats[b.source].passesCompleted/crossesCompleted/forwardPasses`。这里的b.source是槽位，换人后已经指向新人。现有助攻使用statLine并能归回旧人，所以新增“换人前传中”测试只断言助攻时会通过，掩盖另外几个字段的错配。

最小修复：完成传球、完成传中与向前传球的归属也使用动作来源稳定ID，经现有statLine选择正确记录；保持新头球者的sourcePlayerId更新在完成旧传中统计之后。不要一律改用当前槽位人物。

验收：同一实际流程同时断言下场者与新上场者的传球尝试/成功、传中尝试/成功、向前传球、关键传球、助攻，以及头球者的进球。新上场者在未触球时相关计数不能增加。继续检查普通低平传球、头球和倒钩不回归。

不修复会使赛季、位置表现、转会评估和人物履历使用错误统计。

## R4：国家队历史报告绕过新增的ownGoal导入校验

优先级：必须补齐存档校验。位置：international-career.mjs:75的validNationalCareer，及save-slots.mjs的国家队历史验证入口。

独立复现：用生成样本完成国家队动作比赛并结算，将`player.nationalCareer.history.at(-1).report`中的一个真实goal事件改为`ownGoal: 'yes'`，导出后再importBackup。

结果：

```json
{"case":"national report import","accepted":true,"eventType":"goal","invalidOwnGoal":"yes"}
```

根因：俱乐部results与普通职业history走report校验；validNationalCareer检查国家队履历的比分、分钟等外层字段，却没有校验内部report。给俱乐部入口补充布尔/乌龙语义并不能自动覆盖国家队。

最小修复：在国家队历史入口复用一致的报告结构与事件语义校验，允许真实国家队ID和兼容旧缺字段报告；不要为了复用而把国家队ID当成俱乐部ID，也不要制造模块循环或复制一套之后继续漂移的规则。

验收：国家队报告的非布尔ownGoal、能确定的同队乌龙、非法事件/人物引用、错误受益侧、错误比分应被拒绝或按有证据的兼容规则明确处理；有效国家队乌龙报告及旧档缺失报告仍能导出恢复。未知不等于零或伪造完整事实。

这是可构造的损坏导入路径，未声称当前正常游戏会自行生成字符串ownGoal，也未读写真实用户存档。

## 浏览器验收的准确边界

当前浏览器用例完成的是：生成赛果的乌龙标识、归队、个人进球0、比赛复盘打开和刷新恢复。它没有实际触发进球后动态回放播放、镜头切换或暂停；新增回放元数据单元测试不能替代动态画面验收。

这项可以作为补充验收，不需要为了它重写回放。若最终交付声称动态回放正确，应有对应操作证据。

## 可直接交给DeepSeek的下一轮任务

请先阅读本报告，继续做人物归属与存档校验收尾，保护当前未提交工作。本轮范围只包括：

1. 为R3加入失败回归，同时核对传中者的全部相关计数，而非只检查助攻。通过共用来源选择修复，保留头球者、下场者和替补者三个独立人物。
2. 为R4加入真实生成国家队报告的导入反例，统一国家队和俱乐部报告的公共语义校验；保留不同球队ID空间及旧档兼容。
3. 保留种子17/36和已有R1/R2回归，运行事件、身份、职业替补、国家队、保存/恢复专项与必要综合检查。只报告实际运行的范围。
4. 如要确认动态乌龙回放，使用生成数据触发实际回放，核对受益队、动作人标识、无错误个人庆祝和镜头控制；不要把打开静态复盘称作播放回放。
5. 更新TASKS.md和PROJECT_HANDOFF.md，分别记录已经通过的旧问题、本轮新增复现和未验证事项，交回Codex审查。

不包括：回传AI决策调整、人物数据库物理迁移、旧ID重编号、真实存档批量修复、提交推送或发布。

上述收尾通过后，建议进入ID-03的第一小步：统一MyCareer个性化/God Mode的写入口，人物主档作为当前姓名、外观、能力的权威；旧player镜像通过兼容层维护，并验证编辑、进场、国家队和恢复一致。先不同时引入拆表、全量统计重算或通用结算服务。

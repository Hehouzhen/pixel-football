// Diagnostic only: never normalize, generate, repair, or save the input.
import { resolveWorldPlayer } from "./player-registry.mjs";
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const rows = (x) => Array.isArray(x) ? x : [];
const same = (a, b) => a === b || Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i])) || object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => same(a[k], b[k]));
function auditWorldIdentity(season, career = null) {
  const issues = [], counts = { players: 0, matches: 0, events: 0, legacyReports: 0 };
  const add = (severity, code, path, message, ids = []) => issues.push({ severity, code, path, message, playerIds: [...new Set(ids.filter((id) => typeof id === "string"))] });
  const done = () => ({ version: 1, counts, summary: Object.fromEntries(["error", "warning", "info"].map((level) => [level, issues.filter((i) => i.severity === level).length])), issues });
  if (!object(season)) {
    add("error", "INVALID_WORLD", "season", "\u7F3A\u5C11\u4E16\u754C\u5BF9\u8C61");
    return done();
  }
  const registries = [["season.playerData", season.playerData], ["season.nationalWorld.players", season.nationalWorld?.players]], known = /* @__PURE__ */ new Set(), names = /* @__PURE__ */ new Map();
  for (const [path, registry] of registries) {
    if (registry === void 0) {
      if (path === "season.playerData") add("warning", "LEGACY_REGISTRY", path, "\u65E7\u6863\u5C1A\u65E0\u7EDF\u4E00\u7403\u5458\u8868\uFF0C\u4E0D\u80FD\u636E\u6B64\u731C\u6D4B\u8EAB\u4EFD");
      continue;
    }
    if (!object(registry)) {
      add("error", "INVALID_REGISTRY", path, "\u7403\u5458\u8868\u5FC5\u987B\u4E3A\u5BF9\u8C61");
      continue;
    }
    for (const [id, p] of Object.entries(registry)) {
      counts.players++;
      const at = `${path}[${JSON.stringify(id)}]`;
      if (known.has(id)) add("error", "DUPLICATE_PLAYER_ID", at, "\u4E24\u4E2A\u8EAB\u4EFD\u8868\u4F7F\u7528\u4E86\u540C\u4E00\u7F16\u53F7", [id]);
      known.add(id);
      if (!object(p)) {
        add("error", "INVALID_PLAYER", at, "\u7403\u5458\u8D44\u6599\u4E0D\u662F\u5BF9\u8C61", [id]);
        continue;
      }
      if (p.id !== id) add("error", "PLAYER_KEY_MISMATCH", at + ".id", "\u8D44\u6599\u7F16\u53F7\u4E0E\u5B58\u50A8\u952E\u4E0D\u4E00\u81F4", [id, p.id]);
      if (typeof p.name !== "string" || !p.name.trim()) add("warning", "MISSING_NAME", at + ".name", "\u7F3A\u5C11\u5B8C\u6574\u59D3\u540D", [id]);
      else {
        const list = names.get(p.name.trim()) ?? [];
        list.push(id);
        names.set(p.name.trim(), list);
      }
    }
  }
  for (const [name, ids] of names) if (ids.length > 1) add("info", "NAMESAKES", "players", "\u540C\u540D\u4F46\u4E0D\u7B49\u4E8E\u540C\u4E00\u4EBA\uFF1A" + name, ids);
  for (const key of ["rosterIds", "squadIds"]) {
    const table = season[key];
    if (table !== void 0 && !object(table)) {
      add("error", "INVALID_MEMBERSHIP", `season.${key}`, "\u540D\u5355\u6620\u5C04\u5FC5\u987B\u4E3A\u5BF9\u8C61");
      continue;
    }
    const owners = /* @__PURE__ */ new Map();
    for (const [team, ids] of Object.entries(table ?? {})) {
      const at = `season.${key}[${JSON.stringify(team)}]`;
      if (!Array.isArray(ids)) {
        add("error", "INVALID_MEMBERSHIP", at, "\u540D\u5355\u5FC5\u987B\u4E3A\u6570\u7EC4");
        continue;
      }
      const seen = /* @__PURE__ */ new Set();
      for (const id of ids) {
        if (seen.has(id)) add("error", "DUPLICATE_MEMBER", at, "\u540C\u4E00\u540D\u5355\u91CD\u590D\u51FA\u73B0\u672C\u4EBA", [id]);
        seen.add(id);
        if (owners.has(id) && owners.get(id) !== team) add("error", "MULTIPLE_CLUBS", at, "\u672C\u4EBA\u51FA\u73B0\u5728\u4E0D\u540C\u4FF1\u4E50\u90E8\u7684\u5F53\u524D\u540D\u5355\u4E2D", [id]);
        owners.set(id, team);
        const p = resolveWorldPlayer(season, id);
        if (!object(p)) add("error", "MISSING_CURRENT_PLAYER", at, "\u5F53\u524D\u540D\u5355\u5F15\u7528\u4E0D\u5B58\u5728\u7684\u4EBA\u7269", [id]);
        else if (p.teamId !== team || p.freeAgent || p.retired) add("error", "CURRENT_CLUB_MISMATCH", at, "\u5F53\u524D\u540D\u5355\u4E0E\u672C\u4EBA\u6240\u5C5E\u6216\u53EF\u7528\u72B6\u6001\u4E0D\u4E00\u81F4", [id]);
      }
    }
  }
  for (const [key, squad] of Object.entries(season.nationalWorld?.squads ?? {})) {
    const at = `season.nationalWorld.squads[${JSON.stringify(key)}]`, seen = /* @__PURE__ */ new Set();
    for (const member of rows(squad?.members)) {
      const id = member?.playerId;
      if (seen.has(id)) add("error", "DUPLICATE_NATIONAL_MEMBER", at, "\u540C\u4E00\u671F\u56FD\u5BB6\u961F\u540D\u5355\u91CD\u590D\u672C\u4EBA", [id]);
      seen.add(id);
      if (!object(resolveWorldPlayer(season, id))) add("error", "MISSING_CURRENT_PLAYER", at, "\u56FD\u5BB6\u961F\u540D\u5355\u5F15\u7528\u4E0D\u5B58\u5728\u7684\u4EBA\u7269", [id]);
    }
  }
  if (career) {
    const p = resolveWorldPlayer(season, career.id);
    if (!object(p)) add(career.id ? "error" : "warning", "CAREER_IDENTITY_MISSING", "player.id", "\u4E3B\u89D2\u672A\u5173\u8054\u5230\u672C\u4EBA\u6863\u6848", [career.id]);
    else for (const key of ["name", "appearance", "attributes"]) if (!same(career[key] ?? {}, p[key] ?? {})) add("warning", "CAREER_MIRROR_DRIFT", `player.${key}`, "\u4E3B\u89D2\u526F\u672C\u4E0E\u672C\u4EBA\u6863\u6848\u4E0D\u4E00\u81F4\uFF0C\u987B\u6838\u5BF9\u5199\u5165\u6765\u6E90", [career.id]);
  }
  const visitMatches = (matches, path) => {
    const seen = /* @__PURE__ */ new Set();
    rows(matches).forEach((m, i) => {
      const at = `${path}[${i}]`;
      if (!object(m)) {
        add("error", "INVALID_MATCH", at, "\u6BD4\u8D5B\u8BB0\u5F55\u4E0D\u662F\u5BF9\u8C61");
        return;
      }
      const id = m.matchId ?? m.id;
      if (id && seen.has(id)) add("error", "DUPLICATE_MATCH", at, "\u540C\u4E00\u7ED3\u679C\u96C6\u5408\u4E2D\u6BD4\u8D5B\u7F16\u53F7\u91CD\u590D");
      if (id) seen.add(id);
      checkMatch(m, at);
    });
  };
  function checkMatch(m, path) {
    counts.matches++;
    const report = m.report, stats = rows(m.playerStats), members = /* @__PURE__ */ new Map(), teams = report?.teamIds ?? (m.home && m.away ? [m.home, m.away] : []);
    const register = (id, team, row, at) => {
      if (typeof id !== "string") {
        add("warning", "LEGACY_MATCH_ID", at, "\u5F53\u65F6\u672A\u8BB0\u5F55\u4EBA\u7269\u7F16\u53F7\uFF0C\u4E0D\u80FD\u7528\u5F53\u524D\u540C\u4F4D\u7F6E\u4EBA\u7269\u8865\u9F50");
        return;
      }
      const prior = members.get(id);
      if (prior && prior.team && team && prior.team !== team) add("error", "BOTH_SIDES", at, "\u540C\u4E00\u4EBA\u5728\u672C\u573A\u4EE3\u8868\u53CC\u65B9", [id]);
      members.set(id, { ...prior, ...row, team: team ?? prior?.team });
      if (!resolveWorldPlayer(season, id)) add("warning", "HISTORICAL_PLAYER_MISSING", at, "\u5386\u53F2\u4EBA\u7269\u4E0D\u5728\u5F53\u524D\u8EAB\u4EFD\u8868\u4E2D\uFF1B\u4FDD\u7559\u5FEB\u7167\uFF0C\u4E0D\u6620\u5C04\u6210\u65B0\u4EBA", [id]);
    };
    if (stats.length) {
      const seen = /* @__PURE__ */ new Set();
      stats.forEach((r, i) => {
        if (!object(r)) {
          add("error", "INVALID_MATCH_PLAYER", path + `.playerStats[${i}]`, "\u4E2A\u4EBA\u6BD4\u8D5B\u6570\u636E\u4E0D\u662F\u5BF9\u8C61");
          return;
        }
        if (seen.has(r.playerId)) add("error", "DUPLICATE_MATCH_PLAYER", path + `.playerStats[${i}]`, "\u540C\u4E00\u4EBA\u7684\u6BD4\u8D5B\u7EDF\u8BA1\u91CD\u590D", [r.playerId]);
        seen.add(r.playerId);
        register(r.playerId, r.teamId, r, path + `.playerStats[${i}]`);
      });
    } else if (report) {
      const seen = /* @__PURE__ */ new Set();
      rows(report.playerIds).forEach((id, i) => {
        if (typeof id === "string" && seen.has(id)) add("error", "DUPLICATE_MATCH_PLAYER", path + `.report.playerIds[${i}]`, "\u672C\u573A\u4F4D\u7F6E\u91CD\u590D\u5F15\u7528\u540C\u4E00\u4EBA", [id]);
        seen.add(id);
        register(id, teams[Math.floor(i / 6)], {}, path + `.report.playerIds[${i}]`);
      });
      for (const sub of rows(report.substitutions)) {
        if (sub) register(sub.playerId, teams[0], { minuteOn: 0, minuteOff: sub.minuteOff }, path + ".report.substitutions");
      }
      if (!rows(report.playerIds).length) {
        counts.legacyReports++;
        add("warning", "LEGACY_REPORT", path + ".report", "\u65E7\u590D\u76D8\u6CA1\u6709\u4EBA\u7269\u7F16\u53F7\uFF0C\u65E0\u6CD5\u5B8C\u6574\u6838\u9A8C");
      }
    }
    for (const [i, line] of rows(m.lineups).entries()) for (const id of rows(line?.playerIds)) {
      const p = members.get(id);
      if (p && p.team !== line.teamId) add("error", "LINEUP_TEAM_MISMATCH", path + `.lineups[${i}]`, "\u9996\u53D1\u5FEB\u7167\u4E0E\u4E2A\u4EBA\u6570\u636E\u7684\u7403\u961F\u4E0D\u4E00\u81F4", [id]);
      else if (!p && members.size) add("error", "LINEUP_PLAYER_MISSING", path + `.lineups[${i}]`, "\u9996\u53D1\u5FEB\u7167\u7F3A\u5C11\u5BF9\u5E94\u4E2A\u4EBA\u8BB0\u5F55", [id]);
    }
    const events = Array.isArray(m.goalEvents) ? m.goalEvents : rows(report?.events).filter((e) => e?.type === "goal"), totals = /* @__PURE__ */ new Map(), ownGoals = /* @__PURE__ */ new Map();
    let resolvedGoals = 0;
    events.forEach((e, i) => {
      counts.events++;
      const at = path + `.goals[${i}]`;
      if (!object(e)) {
        add("error", "INVALID_EVENT", at, "\u8FDB\u7403\u4E8B\u4EF6\u4E0D\u662F\u5BF9\u8C61");
        return;
      }
      const id = e.scorerId ?? e.playerId ?? report?.playerIds?.[e.player], p = members.get(id), team = e.teamId ?? report?.teamIds?.[e.team] ?? (e.ownGoal === true ? void 0 : p?.team);
      if (typeof id !== "string") add("warning", "LEGACY_EVENT_ID", at, "\u8FDB\u7403\u672A\u4FDD\u5B58\u672C\u4EBA\u7F16\u53F7");
      else if (members.size && !p) add("error", "EVENT_PLAYER_NOT_REGISTERED", at, "\u8FDB\u7403\u8005\u4E0D\u5728\u672C\u573A\u53C2\u8D5B\u8BB0\u5F55\u4E2D", [id]);
      else if (!members.size) add("warning", "EVENT_MEMBERSHIP_UNVERIFIED", at, "\u65E0\u672C\u573A\u62A5\u540D\u8BB0\u5F55\uFF0C\u65E0\u6CD5\u786E\u8BA4\u5386\u53F2\u53C2\u8D5B\u5F52\u5C5E", [id]);
      if (p && team && p.team && p.team !== team && e.ownGoal !== true) add("error", "EVENT_TEAM_MISMATCH", at, "\u8FDB\u7403\u53D7\u76CA\u7403\u961F\u4E0E\u5F53\u573A\u4EE3\u8868\u7403\u961F\u4E0D\u4E00\u81F4", [id]);
      if (e.assistId) {
        const assist = members.get(e.assistId);
        if (!assist) add("error", "ASSIST_NOT_REGISTERED", at, "\u52A9\u653B\u8005\u4E0D\u5728\u672C\u573A\u8BB0\u5F55\u4E2D", [e.assistId]);
        else if (team && assist.team && team !== assist.team) add("error", "ASSIST_TEAM_MISMATCH", at, "\u52A9\u653B\u8005\u4E0D\u662F\u53D7\u76CA\u7403\u961F\u7403\u5458", [e.assistId]);
        if (e.assistId === id) add("error", "SELF_ASSIST", at, "\u8FDB\u7403\u8005\u4E0D\u80FD\u52A9\u653B\u81EA\u5DF1", [id]);
      }
      if (p && Number.isFinite(e.minute) && ((p.minuteOn ?? 0) > e.minute || (p.minuteOff ?? 90) < e.minute)) add("error", "EVENT_OUTSIDE_MINUTES", at, "\u4E8B\u4EF6\u65F6\u95F4\u4E0D\u5728\u8BE5\u7403\u5458\u51FA\u573A\u533A\u95F4", [id]);
      if (team) {
        resolvedGoals++;
        totals.set(team, (totals.get(team) ?? 0) + 1);
        if (e.ownGoal === true) ownGoals.set(team, (ownGoals.get(team) ?? 0) + 1);
      }
      if (p && e.scorerName && p.playerName && e.scorerName !== p.playerName) add("error", "MATCH_NAME_CONFLICT", at, "\u4E8B\u4EF6\u59D3\u540D\u4E0E\u672C\u573A\u59D3\u540D\u5FEB\u7167\u51B2\u7A81", [id]);
    });
    const sides = m.home && m.away ? [m.home, m.away] : report?.teamIds;
    if (Array.isArray(sides) && Array.isArray(m.score)) sides.forEach((team, i) => {
      if ((Array.isArray(m.goalEvents) || Array.isArray(report?.events)) && resolvedGoals === events.length && (totals.get(team) ?? 0) !== m.score[i]) add("error", "GOAL_SCORE_MISMATCH", path + ".score", "\u9010\u7403\u8BB0\u5F55\u4E0E\u6BD4\u5206\u4E0D\u4E00\u81F4");
      if (stats.length && stats.every((r) => object(r) && Number.isFinite(r.goals))) {
        const goals = stats.filter((r) => r.teamId === team).reduce((n, r) => n + r.goals, 0) + (ownGoals.get(team) ?? 0);
        if (goals !== m.score[i]) add("error", "PLAYER_SCORE_MISMATCH", path + ".playerStats", "\u4E2A\u4EBA\u8FDB\u7403\u4E0E\u6BD4\u5206\u4E0D\u4E00\u81F4\uFF08\u5305\u542B\u663E\u5F0F\u4E4C\u9F99\u7403\uFF09");
      }
    });
  }
  visitMatches(season.results, "season.results");
  for (const [id, state] of Object.entries(season.world ?? {})) visitMatches(state?.results, `season.world[${JSON.stringify(id)}].results`);
  visitMatches(season.cup?.results, "season.cup.results");
  rows(season.history).forEach((entry, i) => {
    const a = entry?.archive;
    if (!a) return;
    const path = `season.history[${i}].archive`;
    visitMatches(a.results, path + ".results");
    visitMatches(a.cup?.results, path + ".cup.results");
    rows(a.leagues).forEach((l, j) => visitMatches(l?.matches, path + `.leagues[${j}].matches`));
  });
  visitMatches(career?.history, "player.history");
  visitMatches(career?.journey?.youthResults, "player.journey.youthResults");
  visitMatches(career?.nationalCareer?.history, "player.nationalCareer.history");
  const processed = rows(season.nationalWorld?.processedMatches);
  if (new Set(processed).size !== processed.length) add("error", "DUPLICATE_SETTLEMENT", "season.nationalWorld.processedMatches", "\u56FD\u5BB6\u961F\u7ED3\u7B97\u7F16\u53F7\u91CD\u590D");
  return done();
}
export {
  auditWorldIdentity
};

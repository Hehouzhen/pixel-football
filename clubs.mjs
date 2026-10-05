const club=(id,name,color,secondary,strength,style='balanced',away='#e9ece6')=>({id,name,color,secondary,strength,style,away});

// Fixed 2026/27 selections. Match rosters remain original fictional players.
export const LEAGUES=[
  {id:'england',name:'Premier League · 英超',teams:[
    club('arsenal','Arsenal','#cb3944','#f0ece7',1.13,'press'),club('mancity','Manchester City','#86c6e5','#f0eee7',1.14,'balanced','#243a58'),
    club('liverpool','Liverpool','#c43b44','#e8d5ac',1.12,'press'),club('chelsea','Chelsea','#3663bd','#f0eee7',1.08),
    club('manutd','Manchester United','#c53942','#f0e7d8',1.07,'counter'),club('tottenham','Tottenham Hotspur','#eaeae5','#283856',1.04,'balanced','#283856'),
    club('newcastle','Newcastle United','#e9e9e4','#252e35',1.05,'press','#252e35'),club('astonvilla','Aston Villa','#8b4566','#a1cee7',1.03,'counter')]},
  {id:'spain',name:'LALIGA EA SPORTS · 西甲',teams:[
    club('realmadrid','Real Madrid','#f0eee7','#cdbb77',1.16,'counter','#383650'),club('barcelona','FC Barcelona','#3157a2','#aa334d',1.15,'press','#ead8a8'),
    club('atletico','Atlético de Madrid','#c33b4a','#f0eee8',1.10,'press'),club('athletic','Athletic Club','#c93d47','#f1eee9',1.04,'press'),
    club('realsociedad','Real Sociedad','#438cc0','#eeeae3',1.03),club('betis','Real Betis','#51a074','#eef0e7',1.02),
    club('sevilla','Sevilla FC','#eaeae4','#bb4149',1.00,'counter','#bb4149'),club('valencia','Valencia CF','#eae9e4','#282e35',.99,'counter','#282e35')]},
  {id:'germany',name:'Bundesliga · 德甲',teams:[
    club('bayern','FC Bayern München','#c83c48','#eee9e2',1.16,'press'),club('dortmund','Borussia Dortmund','#e7d04f','#282b2d',1.10,'press','#282b2d'),
    club('leverkusen','Bayer 04 Leverkusen','#bb3b45','#272b32',1.11),club('leipzig','RB Leipzig','#e9e9e3','#c53c43',1.08,'press','#c53c43'),
    club('frankfurt','Eintracht Frankfurt','#282e34','#d74750',1.04,'counter','#d74750'),club('stuttgart','VfB Stuttgart','#eae9e4','#c8474d',1.05,'balanced','#c8474d'),
    club('freiburg','SC Freiburg','#ca464b','#292e32',1.01,'counter'),club('gladbach','Borussia Mönchengladbach','#eaece6','#353b3e',.99,'balanced','#353b3e')]},
  {id:'italy',name:'Serie A Enilive · 意甲',teams:[
    club('inter','Inter','#3465a6','#29313c',1.12),club('milan','AC Milan','#c7434a','#292d32',1.10,'press'),
    club('napoli','SSC Napoli','#6bb9db','#eeeae3',1.11,'press','#2b4461'),club('juventus','Juventus','#e9e9e3','#292e33',1.09,'balanced','#292e33'),
    club('roma','AS Roma','#943c49','#d9a567',1.05,'counter'),club('atalanta','Atalanta','#3977b3','#29303a',1.06,'press'),
    club('lazio','SS Lazio','#91c8dc','#f0ece5',1.02,'balanced','#263d5a'),club('fiorentina','ACF Fiorentina','#7653a6','#ede8e2',1.00,'counter')]},
  {id:'france',name:'Ligue 1 McDonald’s · 法甲',teams:[
    club('psg','Paris Saint-Germain','#2c3e70','#c3414d',1.16,'press'),club('marseille','Olympique de Marseille','#ecece7','#6ab8d4',1.08,'press','#37658e'),
    club('monaco','AS Monaco','#d9444e','#f0ece6',1.07,'counter'),club('lyon','Olympique Lyonnais','#eaece6','#4769a4',1.05,'balanced','#4769a4'),
    club('lille','LOSC Lille','#b93c49','#283e69',1.05,'press'),club('lens','RC Lens','#e5c34b','#ac3c46',1.04,'press','#ac3c46'),
    club('rennes','Stade Rennais FC','#c23e47','#292e32',1.01,'counter'),club('strasbourg','RC Strasbourg Alsace','#4385ba','#e9ece8',1.00)]}
];

// Old six-team seasons stay readable and playable, but new saves use the real leagues above.
export const LEGACY_LEAGUES=[
  {id:'coast',name:'海岸联赛',teams:[club('bay','蓝湾 FC','#77bafd','#e7ecdb',1),club('flame','赤焰联队','#fa8c76','#f1e2ca',1.04),club('tide','潮汐竞技','#9be5d2','#d8ecdf',.96),club('iron','铁桥城','#f7bd76','#d7a166',1.08),club('north','北岸星','#b1a1f3','#e0d9ed',.91),club('forest','森谷队','#c7e478','#e1ebc0',1.02)]},
  {id:'metro',name:'都会联赛',teams:[club('orbit','环城 FC','#86c8f5','#d6eaf1',1.05),club('dawn','破晓联队','#f6aa85','#efd8c7',.98),club('stone','磐石竞技','#b6bbd8','#dfe0e8',1.08),club('pulse','脉冲城','#e4da76','#eee9ad',1.02),club('silver','银港队','#a3e4e6','#dbecee',.94),club('summit','峰线 FC','#d9a6f5','#e9d5ee',1)]}
];
export const getLeague=id=>[...LEAGUES,...LEGACY_LEAGUES].find(l=>l.id===id);
export const getTeam=id=>[...LEAGUES,...LEGACY_LEAGUES].flatMap(l=>l.teams).find(t=>t.id===id);

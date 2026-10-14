import assert from 'node:assert/strict';
import {Match} from './engine.mjs';
import {ABILITIES} from './ratings.mjs';
import {DREAM_PLAYERS,DREAM_PLAYER_BY_ID,dreamPlayer,dreamPackOdds,newDreamSave,loadDreamSave,validDreamSave} from './dream-team.mjs';
import {DREAM_RATING_MODEL_VERSION,DREAM_ROLE_WEIGHTS,dreamGameRole,dreamOverall} from './dream-rating-model.mjs';
import {DREAM_CATALOG_METADATA,DREAM_CARD_MIGRATIONS} from './dream-player-catalog.mjs';

assert.equal(DREAM_RATING_MODEL_VERSION,4);
assert.equal(DREAM_PLAYERS.length,1681);
assert(DREAM_CATALOG_METADATA.newOrdinaryIdentities>=1000);
assert.equal(DREAM_CATALOG_METADATA.deletedCareerCards,282);
assert.equal(DREAM_CATALOG_METADATA.selectedRosters.length,52);
assert.equal(new Set(DREAM_CATALOG_METADATA.selectedRosters.map(row=>row[0])).size,14);
for(const weights of Object.values(DREAM_ROLE_WEIGHTS))assert(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1)<1e-9);
assert(!DREAM_PLAYERS.some(p=>p.editionId==='career-start-2026'||p.editionId==='icon-moments-2026'||p.editionId==='peak-season-2026'));
assert.equal(new Set(DREAM_PLAYERS.map(p=>p.id)).size,DREAM_PLAYERS.length);
assert.equal(new Set(DREAM_PLAYERS.map(p=>p.footballerId)).size,DREAM_PLAYERS.length);
assert.equal(new Set(DREAM_PLAYERS.map(p=>JSON.stringify(p.appearance))).size,DREAM_PLAYERS.length);
for(const p of DREAM_PLAYERS){
  assert.equal(p.gameRole,dreamGameRole(p));assert.equal(p.overall,dreamOverall(p));
  assert(ABILITIES.every(key=>Number.isInteger(p.attributes[key])&&p.attributes[key]>=1&&p.attributes[key]<=99));
  assert(p.referencePeriod&&p.referenceSource.startsWith('https://')&&p.sourceKind&&p.ratingBasis);
  assert.equal(p.role.label,p.gameplayProfile.archetype,'display role and capability profile use one definition');
  assert.equal(dreamOverall({...p,sourceOverall:99,seedOverall:99,historicalImpact:100}),p.overall,'no source/old/history score can inflate abilities or total');
  assert(p.gameplayProfile.strengths.length&&p.gameplayProfile.weaknesses.length);
}
const find=name=>DREAM_PLAYERS.find(p=>p.name===name);
assert(find('Pelé')&&find('Diego Maradona')&&find('Johan Cruyff')&&find('Alfredo Di Stéfano')&&find('Ferenc Puskás')&&find('Roberto Baggio'));
assert(find('Pelé').overall>=97);
assert(find('Gerd Müller').overall>find('Kylian Mbappé').overall);
assert(find('Gerd Müller').attributes.shooting>=98&&find('Gerd Müller').attributes.offBall>=98);
assert(find('Luis Suárez').referencePeriod.startsWith('2015–2016')&&find('Luis Suárez').overall>=95);
assert(find('Robert Lewandowski').referencePeriod.startsWith('2019–2020')&&find('Robert Lewandowski').overall>=95);
assert(find('Philipp Lahm').overall>find('Gianluca Zambrotta').overall);
assert(find('Paolo Maldini').overall>find('Marcel Desailly').overall);
assert(find('Patrick Vieira').overall>find('Gilberto Silva').overall);
const beckham=find('David Beckham');assert(beckham.overall>=89&&beckham.overall<=93);assert.equal(beckham.gameRole,'WM');
assert(beckham.attributes.crossing>beckham.attributes.dribbling+15&&beckham.attributes.longPassing>beckham.attributes.shooting+20);
assert(find('Andrés Iniesta').attributes.strength<65&&find('Andrés Iniesta').attributes.aerial<50);
assert(find('Xavi').attributes.aerial<50&&find('Andrea Pirlo').attributes.aerial<50);
assert(find('George Best').attributes.strength<70&&find('George Best').attributes.dribbling>=98);
assert(find('Park Ji-sung').attributes.endurance>=95);
assert(find('Manuel Neuer').role.id==='keeper-sweeper');
assert(find('Gianluigi Buffon').attributes.shooting<30&&find('Gianluigi Buffon').attributes.reflexes>=95);
assert(find('Andriy Shevchenko').attributes.defense<40);
assert(find('Endrick').overall<85&&find('Pau Cubarsí').overall<90);
assert(DREAM_PLAYERS.every(p=>p.overall<99),'no automatic 99-point slots');
assert(DREAM_PLAYERS.filter(p=>p.id.startsWith('real:zzzzzz-ea-')&&p.overall<85).length>=1000,'ordinary professionals supply the lower bands');
assert.equal(find('Alisson Becker').eaId,212831);assert.equal(find('Dani Carvajal').eaId,204963);assert.equal(find('Reece James').eaId,238074);
assert.equal(find('Son Heung-min').eaId,200104);assert.equal(find('Vinícius Júnior').eaId,238794);
assert.equal(find('Bruno Fernandes').overall,85,'84.50 rounds identically in the game and spreadsheet');
assert.equal(find('David Alaba').overall,82,'81.50 is not rounded down by floating point accumulation');
assert.equal(find('Mohamed Salah').preferredFoot,'左');assert.equal(find('Kylian Mbappé').preferredFoot,'右');
const upgraded=dreamPlayer({upgrades:{[find('Xavi').id]:{dribbling:4}}},find('Xavi').id);assert(upgraded.attributes.dribbling>find('Xavi').attributes.dribbling);
const m=new Match({duration:120,playerAttributes:[find('Gianluigi Buffon').attributes,find('Andriy Shevchenko').attributes,...Array.from({length:10},()=>({}))]});
assert.equal(m.skill(0,'reflexes'),find('Gianluigi Buffon').attributes.reflexes);assert.equal(m.skill(1,'shooting'),find('Andriy Shevchenko').attributes.shooting);
assert.deepEqual(dreamPackOdds('world-scout'),{legend:.015,elite:.065,gold:.25,silver:.67});

// An actual old collection can contain multiple removed editions of the same identity.
const seed=newDreamSave(),base='real:rodrygo',career='card:real:rodrygo:career-start-2026';
assert.equal(DREAM_CARD_MIGRATIONS[career],base);
const legacy={...seed,catalogVersion:undefined,ownedIds:[...seed.ownedIds,career],lineupIds:seed.lineupIds.map(id=>id===base?career:id),
  lineupPresets:Object.fromEntries(Object.entries(seed.lineupPresets).map(([key,ids])=>[key,ids.map(id=>id===base?career:id)])),
  upgrades:{[base]:{shooting:2},[career]:{shooting:3,passing:1}},trainingSpent:{[base]:8,[career]:16},
  playerStats:{[base]:{goals:2,appearances:3},[career]:{goals:1,appearances:2}},trainingPoints:7,
  wishlistIds:[base,career],targetCardId:career,boxDrawnIds:['card:real:kylian-mbappe:career-start-2026'],
  pendingDraw:{packId:'world-scout',rows:[{playerId:career,duplicate:false,duplicateTraining:0,newFootballer:true,guaranteeType:null,guaranteeTier:null}]}};
let stored=JSON.stringify(legacy);const storage={getItem:()=>stored,setItem:(_key,value)=>{stored=value}};
const migrated=loadDreamSave(storage);assert(validDreamSave(migrated));assert.equal(migrated.catalogVersion,4);
assert.equal(migrated.ownedIds.filter(id=>id===base).length,1);assert(migrated.lineupIds.includes(base));
assert.deepEqual(migrated.upgrades[base],{shooting:3,passing:1});assert.equal(migrated.trainingSpent[base],24);
assert.deepEqual(migrated.playerStats[base],{goals:3,appearances:5});assert.equal(migrated.targetCardId,base);
assert.deepEqual(migrated.wishlistIds,[base]);assert.equal(migrated.pendingDraw.rows[0].playerId,base);
assert(migrated.trainingPoints>7);assert.equal(loadDreamSave(storage).trainingPoints,migrated.trainingPoints,'migration compensation is paid once');
console.log('Catalog v4: all identities, source boundaries, historic anchors, real lower-rated pros, and lossless version migration passed.');

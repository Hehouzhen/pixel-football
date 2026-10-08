export const CLEAR_WEATHER={type:'clear',label:'晴天',ballDrag:1,firstTouchPenalty:0,passPenalty:0,goalPenalty:0};
export const WEATHER_TYPES=[CLEAR_WEATHER,
  {type:'drizzle',label:'小雨',ballDrag:.94,firstTouchPenalty:.018,passPenalty:.015,goalPenalty:.06},
  {type:'rain',label:'大雨',ballDrag:.88,firstTouchPenalty:.04,passPenalty:.035,goalPenalty:.13}
];

function pickWeather(roll){return roll<.04?WEATHER_TYPES[2]:roll<.15?WEATHER_TYPES[1]:CLEAR_WEATHER}
function hashUnit(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0)/4294967296}

export function weatherForFixture(state,home,away,week,competition='league'){
  const round=competition==='cup'&&state.cup?`${state.cup.phase}:${state.cup.round}`:week;
  return pickWeather(hashUnit(`${state.seed??0}:${competition}:${round}:${home}:${away}`));
}

export function randomWeather(){return pickWeather(Math.random())}

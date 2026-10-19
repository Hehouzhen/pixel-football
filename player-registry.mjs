// Read-only lookup. IDs are opaque; never infer a person's team or position from them.
function ownPlayer(registry,id){
 return registry&&typeof registry==='object'&&Object.hasOwn(registry,id)?registry[id]:null;
}
export function resolveWorldPlayer(season,id){
 if(typeof id!=='string')return null;
 return ownPlayer(season?.playerData,id)??ownPlayer(season?.nationalWorld?.players,id)??null;
}

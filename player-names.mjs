const surnames=['林','周','陈','江','叶','余','许','沈','陆','宋','何','夏','曹','邱','顾','唐','韩','郑'];
const given=['川','澄','航','野','岚','锐','鸣','辰','越','朗','凯','尧','珂','隽','宁','凡','硕','昕'];
const localNames={
  england:[['Oliver','Mason','Theo','Noah','Elliot','Harry','Jack','Leo'],['Vale','Bennett','Carter','Reed','Walker','Hughes','Ellis','Cole']],
  spain:[['Hugo','Diego','Mateo','Iker','Adrián','Nico','Sergio','Álvaro'],['Aranda','Soler','Vega','Moreno','Ríos','Navarro','Cruz','Molina']],
  germany:[['Lukas','Emil','Jonas','Felix','Leon','Timo','Moritz','Jan'],['Weber','Krüger','Hartmann','Vogel','Keller','Brandt','Neumann','Fischer']],
  italy:[['Luca','Matteo','Marco','Andrea','Enzo','Davide','Nicola','Pietro'],['Rinaldi','Romano','Conti','Ferraro','Costa','Marino','Greco','Moretti']],
  france:[['Hugo','Lucas','Noé','Mathis','Théo','Eliott','Nathan','Maxime'],['Moreau','Laurent','Bernard','Dubois','Roux','Faure','Marchand','Girard']]
};

localNames.england[1].push(...['Watson', 'Turner', 'Parker', 'Foster', 'Cooper', 'Morgan', 'Palmer', 'Brooks', 'Ward', 'Fisher', 'Chapman', 'Russell', 'Stone', 'Fletcher']);
localNames.spain[1].push(...['Castro', 'Romero', 'Torres', 'Ramos', 'Herrera', 'Iglesias', 'Medina', 'Santos', 'Ortega', 'Paredes', 'Fuentes', 'Delgado', 'Alonso', 'Campos']);
localNames.germany[1].push(...['Schneider', 'Hoffmann', 'Becker', 'Wagner', 'Schulz', 'Richter', 'Wolf', 'Braun', 'Zimmermann', 'Koch', 'Bauer', 'Klein', 'Schmitt', 'Lorenz']);
localNames.italy[1].push(...['Ricci', 'Gallo', 'DeLuca', 'Mancini', 'Lombardi', 'Esposito', 'Caruso', 'Leone', 'Marchetti', 'Barbieri', 'Fontana', 'Santoro', 'Rizzo', 'Vitale']);
localNames.france[1].push(...['Lefebvre', 'Martin', 'Petit', 'Garnier', 'Chevalier', 'Clement', 'Durand', 'Mercier', 'Perrin', 'Bonnet', 'Fontaine', 'Lambert', 'Rousseau', 'Vincent']);
const pools=leagueId=>localNames[leagueId]??[surnames,given];
export function fictionalName(leagueId,serial){const [first,last]=pools(leagueId),n=((serial%(first.length*last.length))+first.length*last.length)%(first.length*last.length);return `${first[n%first.length]}${localNames[leagueId]?' ':''}${last[Math.floor(n/first.length)]}`}
export function prospectName(leagueId,seed,existing){const [first,last]=pools(leagueId),count=first.length*last.length;for(let i=0;i<count;i++){const name=fictionalName(leagueId,(seed%count+i)%count);if(!existing.has(name))return name}for(let i=0;i<count*first.length;i++){const n=(seed% (count*first.length)+i)%(count*first.length),a=first[n%first.length],b=first[Math.floor(n/first.length)%first.length],c=last[Math.floor(n/(first.length*first.length))],name=localNames[leagueId]?`${a} ${b} ${c}`:`${a}${b}${c}`;if(!existing.has(name))return name}throw new Error('球员姓名池已满');}

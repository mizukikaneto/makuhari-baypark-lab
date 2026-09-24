import {BUILDINGS,G,center,project,PARK_A,PARK_B,PARK_CENTER,STATION_CENTER} from './map-data.mjs';
export const SOURCES = {
  osm: 'https://www.openstreetmap.org/copyright',
  layout: 'https://www.makuhari-pj6.com/shinchiku/G2571001/baypark.html',
  arena: 'https://www.city.chiba.jp/shimin/seikatsubunka/sports/chibamakuhariarena.html',
  arenaPlan: 'https://ssl4.eir-parts.net/doc/3003/ir_material16/254693/00.pdf',
  closure: 'https://www.seibu-la.co.jp/makuhari/news/202608141003299253.html',
  station: 'https://www.jreast.co.jp/estation/station/info.aspx?StationCd=413',
  park: 'https://www.seibu-la.co.jp/makuhari/files/universal_map_makuhari.pdf',
  towers: 'https://www.makuhari-pj6.com/shinchiku/G2571001/baypark.html',
  city: 'https://www.city.chiba.jp/sogoseisaku/miraitoshi/makuhari/makuharishintoshinbaytown.html',
  hospital: 'https://www.city.chiba.jp/byoin/kikaku/shinbyouinseibi.html',
  school: 'https://www.city.chiba.jp/kyoiku/kyoikusomu/kikaku/shinsetsukou_bunri.html',
  senior: 'https://www.mfrw.co.jp/parkwellstate/makuhari/outline/',
  map: 'https://www.city.chiba.jp/kyoiku/kyoikusomu/kikaku/documents/setumeisiryou.pdf'
};
export const FACILITIES = [
  {id:'cross',name:'クロスタワー＆レジデンス',short:'クロスタワー',x:-155,z:-82,floors:37,units:497,year:2019,color:0xd3ddd7,type:'tower',note:'2019年2月入居開始。タワー棟37階とレジデンス棟8階、計497戸。保育施設や交流拠点を併設。',source:SOURCES.towers},
  {id:'sky',name:'スカイグランドタワー',short:'スカイグランド',x:-155,z:85,floors:48,units:826,year:2021,color:0xdae5e5,type:'tower',note:'2021年2月入居開始。街の西側に立つ48階建て。医療施設や商業施設を備える街区。',source:SOURCES.towers},
  {id:'mid',name:'ミッドスクエアタワー',short:'ミッドスクエア',x:0,z:85,floors:43,units:749,year:2024,color:0xd6d9d9,type:'tower',note:'2024年2月入居開始。43階・749戸。保育施設などを備え、公園に面する街区。',source:SOURCES.towers},
  {id:'senior',name:'パークウェルステイト',short:'パークウェルステイト',x:155,z:-82,floors:28,units:617,year:2024,color:0xd7d9c8,type:'senior',note:'2024年9月開業。28階・617室のシニアのための住まい。一般住宅とは別の世帯人数を仮定。',source:SOURCES.senior},
  {id:'rise',name:'ライズゲートタワー',short:'ライズゲート',x:155,z:85,floors:38,units:768,year:2026,color:0xe2d9cb,type:'tower',note:'2026年2月入居開始。街区の南東側に立つ38階建て・768戸のタワー。',source:SOURCES.towers},
  {id:'bloom',name:'ブルームテラスタワー',short:'ブルームテラス',x:0,z:-82,floors:42,units:650,year:2028,color:0xe4c8a8,type:'tower',planned:true,note:'42階・650戸。2027年竣工、2028年入居開始予定。建設の進み方は演出であり実際の工程ではありません。',source:SOURCES.towers},
  {id:'school',name:'幕張若葉小学校',short:'幕張若葉小学校',x:102,z:-204,floors:4,year:2026,color:0xc5d8d0,type:'school',note:'2026年4月1日開校。街の成長とともに整備された新しい小学校。',source:SOURCES.school},
  {id:'hospital',name:'千葉市立幕張海浜病院',short:'幕張海浜病院',x:256,z:-213,floors:6,year:2027,displayYear:'2026年10月',color:0xc9d9dd,type:'hospital',planned:true,note:'2026年10月1日開院、外来は10月6日開始予定。基準日の9月24日時点では開院前のため、2026年表示では計画施設として表示します。',source:SOURCES.hospital},
  {id:'park',name:'若葉3丁目公園',short:'若葉3丁目公園',x:0,z:0,floors:0,year:2019,type:'park',note:'街の中心にある楕円形の公園。タワーや生活施設が周囲に配置されています。公園外周は公開地図の座標、植栽は簡略表現です。',source:SOURCES.towers},
  {id:'aeon',name:'イオンスタイル幕張ベイパーク',short:'イオンスタイル',x:-282,z:-38,floors:2,year:2019,color:0xc2cbd0,type:'shop',note:'2019年4月開業。街の毎日の暮らしを支える商業施設。建物形状・位置は概略です。',source:SOURCES.city},
  {id:'station',name:'JR海浜幕張駅',short:'海浜幕張駅',year:1986,type:'station',note:'公園改札は2025年3月開業。利用時間は4:45〜22:00。中央改札の南口も選べます。',source:SOURCES.station},
  {id:'parkA',name:'幕張海浜公園 Aブロック',short:'公園 Aブロック',year:1986,type:'park',note:'2026年8月18日からアリーナ整備工事のため立入不可。境界は公開地図からの概形で、現地の仮囲い位置を測量したものではありません。',source:SOURCES.closure},
  {id:'parkB',name:'幕張海浜公園 Bブロック',short:'公園 Bブロック',year:1986,type:'park',note:'大芝生広場・花時計・わんぱく広場などがある公園。園路と公園外周は公開地図の座標を反映。',source:SOURCES.park},
  {id:'parkC',name:'幕張海浜公園 Cブロック・見浜園',short:'Cブロック・見浜園',year:1986,type:'park',note:'海側に広がるCブロックと日本庭園・見浜園。外周・園路は公開地図を参照。',source:SOURCES.park},
  {id:'arena',name:'（仮称）幕張アリーナ',short:'新アリーナ計画',year:2030,type:'arena',planned:true,note:'アルティーリ千葉の新たなホームアリーナ。2030年開業目標、地上6階・高さ約43m・客席2万席規模。精密な建物配置が未確認のため、公表されたAブロックの計画区域を表示しています。',source:SOURCES.arena}
].map(f=>{const b=BUILDINGS.find(b=>b.id===f.id);const extra={park:PARK_CENTER,station:STATION_CENTER,parkA:center(PARK_A),parkB:center(PARK_B),parkC:center(G.features.find(g=>g.id==='208037154').p),arena:project(35.64965,140.0462),aeon:project(35.64672,140.04893)};const p=b?.center||extra[f.id]||[f.x,f.z];return {...f,x:p[0],z:p[1],height:b?.heightForRendering||0,floors:b?.floors??f.floors,geometry:b};});
for(const b of BUILDINGS.filter(b=>['parking','surface_parking','residence'].includes(b.kind))){const parent=['cross','sky','mid','bloom','rise','senior','hospital'].find(id=>b.id.includes(id));const host=FACILITIES.find(f=>f.id===parent);FACILITIES.push({id:b.id,name:b.name,short:b.name.replace('幕張ベイパーク','').replace('幕張海浜病院','病院'),x:b.center[0],z:b.center[1],height:b.heightForRendering,type:b.kind==='residence'?'residence':'parking',year:host?.year||2026,source:b.geometrySource,geometry:b,note:b.geometryAccuracy+' '+b.heightAccuracy});}
export function simulate(state) {
  const active=FACILITIES.filter(f=>f.units&&f.year<=state.year);
  const homes=active.filter(f=>f.type==='tower').reduce((n,f)=>n+f.units,0);
  const senior=active.filter(f=>f.type==='senior').reduce((n,f)=>n+f.units,0);
  const population=Math.round((homes*2.5+senior*1.2)*state.occupancy/100);
  const regularPop=homes*2.5*state.occupancy/100;
  const demand=Math.max(1,Math.round(regularPop*.055));
  const baseCapacity=state.year<2021?90:state.year<2024?180:state.year<2026?260:340;
  const capacity=baseCapacity+state.nurseries;
  const coverage=Math.min(100,Math.round(capacity/demand*100));
  const traffic=Math.round(Math.max(8,Math.min(100,18+population/135-state.buses*3)));
  const wait=state.buses===0?null:Math.round(30/state.buses);
  return {population,homes,demand,capacity,coverage,traffic,wait,shortage:Math.max(0,demand-capacity)};
}

// Jöle Atış (ana oyun) bölümleri. Her bölüm, küplerden oluşan bir piksel resimdir.
// Harfler renkleri gösterir, '.' boş hücredir.

export const CUBE_COLORS = {
  r: '#FF3B5C', // kırmızı
  o: '#FF8C1A', // turuncu
  y: '#FFD60A', // sarı
  g: '#3DDC84', // yeşil
  b: '#2D9CFF', // mavi
  p: '#A259FF', // mor
  i: '#FF8FC7', // pembe
  w: '#F4F1FA', // beyaz
  n: '#A0643A', // kahverengi
  k: '#3A2A4A', // koyu
};

export const COLOR_NAMES = {
  r: 'Kırmızı', o: 'Turuncu', y: 'Sarı', g: 'Yeşil', b: 'Mavi',
  p: 'Mor', i: 'Pembe', w: 'Beyaz', n: 'Kahverengi', k: 'Koyu',
};

// slots: bekleme kutusu sayısı, columns: jöle sütunu sayısı, belt: kaykay yolundaki en fazla jöle,
// ammo: jölelerin mermi sayıları (renk başına küp sayısı bu parçalara bölünür),
// shuffle: sıralamanın ne kadar karışık olacağı (0 = en kolay)
// Değerler, rastgele oynayan bir botun kazanma oranı bölümden bölüme düşecek şekilde simülasyonla ayarlandı.
export const MAIN_LEVELS = [
  {
    id: 1, name: 'Kalp', slots: 5, columns: 2, belt: 4, ammo: [10, 20], shuffle: 0,
    art: [
      '.rr...rr.',
      'rwrr.rrrr',
      'rwrrrrrrr',
      'rrrrrrrrr',
      '.rrrrrrr.',
      '..rrrrr..',
      '...rrr...',
      '....r....',
    ],
  },
  {
    id: 2, name: 'Mantar', slots: 5, columns: 2, belt: 4, ammo: [10, 20], shuffle: 0,
    art: [
      '...rrrr...',
      '..rrwwrr..',
      '.rrwwrrrr.',
      'rrrrrrwwrr',
      'rwwrrrwwrr',
      'rrrrrrrrrr',
      '...wwww...',
      '...wkwk...',
      '...wwww...',
      '....ww....',
    ],
  },
  {
    id: 3, name: 'Çiçek', slots: 3, columns: 3, belt: 5, ammo: [10, 20, 30], shuffle: 1,
    art: [
      '...iiii...',
      '..iiiiii..',
      '.iiyyyyii.',
      '.iiyooyii.',
      '.iiyyyyii.',
      '..iiiiii..',
      '...iiii...',
      '....gg....',
      '.gg.gg.gg.',
      '..gggggg..',
      '....gg....',
    ],
  },
  {
    id: 4, name: 'Dondurma', slots: 3, columns: 3, belt: 4, ammo: [10, 20, 30], shuffle: 3,
    art: [
      '....rr....',
      '...iiii...',
      '..iiwiii..',
      '.iiiiiiii.',
      '.ggggwggg.',
      '.gggggggg.',
      '..nnnnnn..',
      '..nynnyn..',
      '...nnnn...',
      '...nynn...',
      '....nn....',
      '....n.....',
    ],
  },
  {
    id: 5, name: 'Kedi', slots: 3, columns: 3, belt: 5, ammo: [10, 20, 30], shuffle: 8,
    art: [
      '.o.......o.',
      '.oo.....oo.',
      '.ooooooooo.',
      'ooooooooooo',
      'oogkooogkoo',
      'ooooooooooo',
      'owwooioowwo',
      'owwwwwwwwwo',
      '.owwwwwwwo.',
      '..ooooooo..',
    ],
  },
  {
    id: 6, name: 'Yıldız', slots: 4, columns: 3, belt: 4, ammo: [5, 10, 20], shuffle: 6,
    art: [
      '.....o.....',
      '....oyo....',
      '....oyo....',
      '...oyyyo...',
      'ooooyyyoooo',
      'oyyyyyyyyyo',
      '.oyykyykyo.',
      '..oyyyyyo..',
      '..oyyiyyo..',
      '.oyyyoyyyo.',
      '.oyyo.oyyo.',
      'oooo...oooo',
    ],
  },
  {
    id: 7, name: 'Ev', slots: 2, columns: 4, belt: 5, ammo: [5, 10, 20], shuffle: 6,
    art: [
      '.....rr.....',
      '....rrrr....',
      '...rrrrrr.k.',
      '..rrrrrrrrk.',
      '.rrrrrrrrrr.',
      'rrrrrrrrrrrr',
      '.yyyyyyyyyy.',
      '.ybbyyyybby.',
      '.ybbyyyybby.',
      '.yyyynnyyyy.',
      '.yyyynnyyyy.',
      '.yyyynnyyyy.',
      'gggggggggggg',
    ],
  },
  {
    id: 8, name: 'Gökkuşağı', slots: 3, columns: 4, belt: 4, ammo: [5, 10, 20], shuffle: 4,
    art: [
      '....rrrrr....',
      '..rroooooorr.',
      '.rooyyyyyyoor',
      'roygggggggyor',
      'roygbbbbbgyor',
      'roygbpppbgyor',
      'roygbp.pbgyor',
      'roygbp.pbgyor',
      'ww.........ww',
      'www.......www',
    ],
  },
  {
    id: 9, name: 'Balık', slots: 2, columns: 4, belt: 4, ammo: [10, 20], shuffle: 0,
    art: [
      '.....bbbb....',
      '...bbbbbbb...',
      '.bbbbbbbbbbo.',
      'bbwkbbbbbbboo',
      'bbwwbbbbbbooo',
      'bbbbbbbbbbboo',
      '.bbbbbbbbbbo.',
      '..bbbbbbbb...',
      '....ooo......',
      '.....oo......',
    ],
  },
  {
    id: 10, name: 'Roket', slots: 2, columns: 4, belt: 4, ammo: [5, 10], shuffle: 4,
    art: [
      '.....rr.....',
      '....rrrr....',
      '...rrrrrr...',
      '...wwwwww...',
      '...wwbbww...',
      '...wbbbbw...',
      '...wwbbww...',
      '...wwwwww...',
      '...wwwwww...',
      '..rwwwwwwr..',
      '.rrwwwwwwrr.',
      'rrrwwwwwwrrr',
      '...oyyyyo...',
      '....oyyo....',
      '.....oo.....',
    ],
  },
];

export const getMainLevel = (id) => MAIN_LEVELS.find((l) => l.id === id) ?? null;

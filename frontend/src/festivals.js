// Festivals across Tunisia, grouped by region. `note` holds edition or venue details.
export const festivalRegions = [
  {
    id: 'greater-tunis',
    region: 'Greater Tunis',
    places: 'Tunis, Ariana, Ben Arous, Manouba',
    festivals: [
      { id: 'international-festival-of-carthage', name: 'International Festival of Carthage', when: 'July to August', note: '60th edition ran 16 July to 19 August 2026' },
      { id: 'carthage-film-festival', name: 'Carthage Film Festival (JCC)', when: 'Late October to November' },
      { id: 'carthage-theatre-days', name: 'Carthage Theatre Days (JTC)', when: 'Usually November' },
      { id: 'jazz-a-carthage', name: 'Jazz à Carthage', when: 'April' },
      { id: 'oudhna-international-festival-of-popular-arts', name: 'Oudhna International Festival of Popular Arts', when: 'July to August' },
      { id: 'ramadan-medina-festival', name: 'Ramadan Medina Festival', when: 'During Ramadan' },
    ],
  },
  {
    id: 'cap-bon',
    region: 'Cap Bon and the Northeast',
    places: 'Nabeul, Zaghouan',
    festivals: [
      { id: 'international-festival-of-hammamet', name: 'International Festival of Hammamet', when: 'July to August', note: '60th edition' },
      { id: 'orange-blossom-festival-menzel-bouzelfa', name: 'Orange Blossom Festival, Menzel Bouzelfa', when: 'April to May' },
      { id: 'cinemajet-zaghouan', name: 'CinemaJet, Zaghouan', when: 'Early September' },
    ],
  },
  {
    id: 'north',
    region: 'North and Northwest',
    places: 'Bizerte, Béja, Jendouba, Le Kef, Siliana',
    festivals: [
      { id: 'tabarka-jazz-festival', name: 'Tabarka Jazz Festival', when: 'Usually July' },
      { id: 'ghar-el-melh-cultural-days', name: 'Ghar El Melh cultural days', when: 'Late July', note: '45th edition in 2026' },
      { id: 'mateur-summer-festival', name: 'Mateur summer festival', when: 'Late July' },
      { id: 'beja-international-festival', name: 'Béja International Festival', when: 'July to August', note: '46th edition' },
      { id: 'dougga-festival', name: 'Dougga festival', when: 'Summer', note: 'Held at the Roman site' },
      { id: 'le-kef-summer-festival', name: 'Le Kef summer festival', when: 'Summer' },
      { id: 'siliana-international-festival', name: 'Siliana International Festival', when: 'Late July', note: '49th edition' },
    ],
  },
  {
    id: 'sahel',
    region: 'Sahel',
    places: 'Sousse, Monastir, Mahdia',
    festivals: [
      { id: 'sousse-international-festival', name: 'Sousse International Festival', when: 'July to August' },
      { id: 'monastir-international-festival', name: 'Monastir International Festival', when: 'Summer' },
      { id: 'monastir-international-arts-festival', name: 'Monastir International Arts Festival (visual arts)', when: 'Early September', note: '21st edition in 2026' },
      { id: 'contemporary-dance-festival-monastir', name: 'Contemporary dance festival, Monastir', when: 'Early September' },
      { id: 'mahdia-summer-festival', name: 'Mahdia summer festival', when: 'Summer' },
    ],
  },
  {
    id: 'center',
    region: 'Center',
    places: 'Kairouan, Sidi Bouzid, Kasserine',
    festivals: [
      { id: 'sbeitla-festival', name: 'Sbeitla festival', when: 'Summer', note: 'Held at the ancient site' },
      { id: 'mawlid-celebrations-kairouan', name: 'Mawlid celebrations, Kairouan', when: 'Mawlid, date moves each year', note: 'About 24 or 25 August in 2026' },
    ],
  },
  {
    id: 'sfax',
    region: 'Sfax and the Islands',
    places: 'Sfax, Kerkennah, Djerba',
    festivals: [
      { id: 'sfax-international-festival', name: 'Sfax International Festival', when: 'July to August' },
      { id: 'ali-ben-ayed-festival-kerkennah', name: 'Ali Ben Ayed Festival, Kerkennah', when: 'Winter' },
      { id: 'djerba-summer-events', name: 'Djerba summer events', when: 'July to August' },
    ],
  },
  {
    id: 'south',
    region: 'South and Sahara',
    places: 'Gabès, Medenine, Tozeur, Kebili, Tataouine',
    festivals: [
      { id: 'gabes-summer-festival', name: 'Gabès summer festival', when: 'July to August' },
      { id: 'festival-of-the-oases-tozeur', name: 'Festival of the Oases, Tozeur', when: 'Late November to December' },
      { id: 'tamerza-cultural-days', name: 'Tamerza cultural days', when: 'Late July' },
      { id: 'international-festival-of-the-sahara-douz', name: 'International Festival of the Sahara, Douz', when: 'December' },
      { id: 'ksour-festival-tataouine', name: 'Ksour festival, Tataouine', when: 'Usually spring', note: 'Held in the Berber ksour' },
    ],
  },
]

// Every festival with its region, in page order (plans look festivals up by id)
export const allFestivals = () =>
  festivalRegions.flatMap((r) => r.festivals.map((f) => ({ ...f, regionId: r.id, region: r.region })))

// festival_plans rows (newest first) → My plan cards; ids no longer in the list are skipped
export function festivalCards(rows, list) {
  return rows.flatMap((row) => {
    const f = list.find((x) => x.id === row.festival_id)
    return f ? [{ id: f.id, name: f.name, region: f.region, regionId: f.regionId, when: f.when, at: row.created_at }] : []
  })
}

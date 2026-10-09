// Festivals across Tunisia, grouped by region. `note` holds edition or venue details.
export const festivalRegions = [
  {
    id: 'greater-tunis',
    region: 'Greater Tunis',
    places: 'Tunis, Ariana, Ben Arous, Manouba',
    festivals: [
      { name: 'International Festival of Carthage', when: 'July to August', note: '60th edition ran 16 July to 19 August 2026' },
      { name: 'Carthage Film Festival (JCC)', when: 'Late October to November' },
      { name: 'Carthage Theatre Days (JTC)', when: 'Usually November' },
      { name: 'Jazz à Carthage', when: 'April' },
      { name: 'Oudhna International Festival of Popular Arts', when: 'July to August' },
      { name: 'Ramadan Medina Festival', when: 'During Ramadan' },
    ],
  },
  {
    id: 'cap-bon',
    region: 'Cap Bon and the Northeast',
    places: 'Nabeul, Zaghouan',
    festivals: [
      { name: 'International Festival of Hammamet', when: 'July to August', note: '60th edition' },
      { name: 'Orange Blossom Festival, Menzel Bouzelfa', when: 'April to May' },
      { name: 'CinemaJet, Zaghouan', when: 'Early September' },
    ],
  },
  {
    id: 'north',
    region: 'North and Northwest',
    places: 'Bizerte, Béja, Jendouba, Le Kef, Siliana',
    festivals: [
      { name: 'Tabarka Jazz Festival', when: 'Usually July' },
      { name: 'Ghar El Melh cultural days', when: 'Late July', note: '45th edition in 2026' },
      { name: 'Mateur summer festival', when: 'Late July' },
      { name: 'Béja International Festival', when: 'July to August', note: '46th edition' },
      { name: 'Dougga festival', when: 'Summer', note: 'Held at the Roman site' },
      { name: 'Le Kef summer festival', when: 'Summer' },
      { name: 'Siliana International Festival', when: 'Late July', note: '49th edition' },
    ],
  },
  {
    id: 'sahel',
    region: 'Sahel',
    places: 'Sousse, Monastir, Mahdia',
    festivals: [
      { name: 'Sousse International Festival', when: 'July to August' },
      { name: 'Monastir International Festival', when: 'Summer' },
      { name: 'Monastir International Arts Festival (visual arts)', when: 'Early September', note: '21st edition in 2026' },
      { name: 'Contemporary dance festival, Monastir', when: 'Early September' },
      { name: 'Mahdia summer festival', when: 'Summer' },
    ],
  },
  {
    id: 'center',
    region: 'Center',
    places: 'Kairouan, Sidi Bouzid, Kasserine',
    festivals: [
      { name: 'Sbeitla festival', when: 'Summer', note: 'Held at the ancient site' },
      { name: 'Mawlid celebrations, Kairouan', when: 'Mawlid, date moves each year', note: 'About 24 or 25 August in 2026' },
    ],
  },
  {
    id: 'sfax',
    region: 'Sfax and the Islands',
    places: 'Sfax, Kerkennah, Djerba',
    festivals: [
      { name: 'Sfax International Festival', when: 'July to August' },
      { name: 'Ali Ben Ayed Festival, Kerkennah', when: 'Winter' },
      { name: 'Djerba summer events', when: 'July to August' },
    ],
  },
  {
    id: 'south',
    region: 'South and Sahara',
    places: 'Gabès, Medenine, Tozeur, Kebili, Tataouine',
    festivals: [
      { name: 'Gabès summer festival', when: 'July to August' },
      { name: 'Festival of the Oases, Tozeur', when: 'Late November to December' },
      { name: 'Tamerza cultural days', when: 'Late July' },
      { name: 'International Festival of the Sahara, Douz', when: 'December' },
      { name: 'Ksour festival, Tataouine', when: 'Usually spring', note: 'Held in the Berber ksour' },
    ],
  },
]

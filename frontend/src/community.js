// Example posts so the forum isn't empty. Aaslema loads real posts from Supabase;
// replace these (or connect a backend) before launch.
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

export const samplePosts = [
  {
    id: 'sample-1',
    userName: 'Leila B.',
    cityId: 'tozeur',
    cityName: 'Tozeur',
    title: 'Sunrise at Chebika before the tour buses',
    content: 'Rent a bike in Tozeur the evening before and leave at 5am. The road to the mountain oases is flat until the last stretch, and you get the canyon and the waterfall to yourself for a good hour.',
    imageUrls: ['/images/cities/tozeur-1.jpg', '/images/cities/tozeur-2.jpg'],
    tags: ['bikepacking', 'oasis', 'sunrise'],
    likes: 14,
    comments: 3,
    createdAt: hoursAgo(5),
  },
  {
    id: 'sample-2',
    userName: 'Tom R.',
    cityId: 'tunis',
    cityName: 'Tunis',
    title: 'Which TGM stop for Sidi Bou Said?',
    content: 'Get off at Sidi Bou Said, not Sidi Dhrif. The walk up from the station takes ten minutes. Tickets are bought at the window before you board, and keep it until you leave the platform at the other end.',
    imageUrls: [],
    tags: ['transport', 'tips'],
    likes: 9,
    comments: 5,
    createdAt: hoursAgo(26),
  },
  {
    id: 'sample-3',
    userName: 'Yasmine K.',
    cityId: 'tataouine',
    cityName: 'Tataouine',
    title: 'Sleeping in a ksar on a backpacker budget',
    content: 'A few of the ghorfas around Ksar Ouled Soltane rent out rooms for the night. Ask in the café at the foot of the ksar. Bring a warm layer, the desert nights get cold even in April.',
    imageUrls: ['/images/cities/tataouine-2.jpg'],
    tags: ['backpacking', 'ksar', 'budget'],
    likes: 21,
    comments: 7,
    createdAt: hoursAgo(72),
  },
]

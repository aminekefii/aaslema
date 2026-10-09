// All page content lives here so the landing page can be re-branded
// without touching the section components.

const img = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

export const brand = {
  name: 'Aaslema',
  email: 'hello@aaslema.com',
  phone: '+216 71 000 000',
  address: '12 Avenue Habib Bourguiba, Tunis, Tunisia',
  hours: 'Mon - Fri, 08am - 05pm',
}

export const navLinks = [
  ['Home', '/#home'],
  ['Tours', '/#tours'],
  ['Destinations', '/#destinations'],
  ['Blog', '/#blog'],
  ['Contact', '/contact'],
  ['FAQ', '/faq'],
]

export const faqs = [
  {
    q: 'When is the best time to visit Tunisia?',
    a: 'Spring (March to May) and autumn (September to November) are the most pleasant for cities and ruins. Winter is best for the Sahara, and summer for the beaches of the north.',
  },
  {
    q: 'Is Tunisia safe for solo travelers?',
    a: 'Yes, Tunisia is generally safe and welcoming. As anywhere, stay aware of your surroundings in crowded markets and respect local customs in more conservative rural areas.',
  },
  {
    q: 'Do I need a visa to enter?',
    a: 'Many nationalities, including EU, US, Canadian and UK citizens, can enter visa-free for up to 90 days. Requirements change, so check with the nearest Tunisian consulate before you travel.',
  },
  {
    q: "What's the best way to travel between cities?",
    a: 'Louages (shared taxis) are the fastest and most local option. Trains connect Tunis, Sousse, Sfax and Gabès. Cycling is the slowest and the most rewarding.',
  },
  {
    q: 'What languages are spoken?',
    a: 'Tunisian Arabic (Derja) is the main language. French is widely spoken, and English is increasingly common in tourist areas and among younger people.',
  },
]

export const heroImage = '/images/cities/tunis-1.jpg'

export const featuredCities = [
  { name: 'Tunis', vibe: 'Cosmopolitan & Historic', image: '/images/cities/tunis-1.jpg' },
  { name: 'Sousse', vibe: 'Energetic & Mediterranean', image: '/images/cities/sousse-1.jpg' },
  { name: 'Tataouine', vibe: 'Sci-Fi & Ancient', image: '/images/cities/tataouine-1.jpg' },
  { name: 'Jendouba', vibe: 'Alpine & Coastal', image: '/images/cities/jendouba-1.jpg' },
  { name: 'Kairouan', vibe: 'Spiritual & Ancient', image: '/images/cities/kairouan-1.jpg' },
]

export const popularDestinations = [
  { image: '/images/cities/mahdia-2.jpg', name: 'Maldives Islands', info: '5352+ tours & 856+ activities' },
  { image: '/images/cities/sousse-2.jpg', name: 'Paris, France', info: '4120+ tours & 612+ activities' },
  { image: '/images/cities/monastir-2.jpg', name: 'Bali, Indonesia', info: '3870+ tours & 540+ activities' },
  { image: '/images/cities/kef-2.jpg', name: 'Mount Everest, Nepal', info: '980+ tours & 210+ activities' },
  { image: '/images/cities/sfax-2.jpg', name: 'Dubai, UAE', info: '2950+ tours & 430+ activities' },
  { image: '/images/cities/bizerte-2.jpg', name: 'Tanah Lot, Bali', info: '1640+ tours & 305+ activities' },
]

export const features = [
  { icon: 'tent', title: 'Tent Camping', text: 'Sleep under the stars and wake up surrounded by nature.' },
  { icon: 'sailboat', title: 'Kayaking', text: 'Paddle hidden coves and calm lakes at your own pace.' },
  { icon: 'bike', title: 'Mountain Biking', text: 'Ride trails that test your legs and reward your eyes.' },
  { icon: 'fish', title: 'Fishing & Boat', text: 'Slow days on the water with a local skipper.' },
]

export const appPerks = ['Experienced Agency', 'Professional Team', 'Low Cost Travel', 'Online Support 24/7']

export const testimonials = [
  { quote: 'I rode from Tunis down to Tozeur with the bikepacking route from the trip planner. The city guides told me where to sleep and where the water stops were, and the gravel tracks into the Sahara were unreal.', name: 'Randall Vasquez', role: 'Bikepacker', avatar: img('1500648767791-00dcc994a43e', 120) },
  { quote: 'Louages scared me at first, but the guide explained exactly how they work. Two weeks of medinas, guesthouses and street food on a backpacker budget, and I never felt lost.', name: 'Sarah Mitchell', role: 'Backpacker', avatar: img('1494790108377-be9c29b29330', 120) },
  { quote: 'We followed the history itinerary: Carthage, El Jem, the Great Mosque of Kairouan and Matmata. Everything was paced well, and the community tips on where to eat were spot on.', name: 'James Carter', role: 'History Traveler', avatar: img('1507003211169-0a1dd7228f2d', 120) },
  { quote: 'I travel solo a lot and rarely feel this looked after. I met other travelers through the community, shared a louage to Tataouine, and slept in a ksar under the stars.', name: 'Emma Laurent', role: 'Solo Traveler', avatar: img('1438761681033-6461ffad8d80', 120) },
]

export const ctas = [
  { image: '/images/cities/tozeur-2.jpg', tag: 'Tent Camping', title: 'Explore the world’s best campsites' },
  { image: '/images/cities/gabes-2.jpg', tag: 'Sea Beach', title: 'The clearest beaches in Thailand' },
  { image: '/images/cities/zaghouan-2.jpg', tag: 'Water Falls', title: 'Hidden waterfalls of Bali, Indonesia' },
]

export const posts = [
  { image: '/images/cities/jendouba-2.jpg', tag: 'History', title: 'Bulla Regia: The Roman Villas Built Underground in Jendouba', date: '25 February 2026', comments: 5 },
  { image: '/images/cities/medenine-2.jpg', tag: 'Backpacking', title: 'Sleeping in a Ksar: A Backpacker’s Guide to Medenine', date: '18 March 2026', comments: 8 },
  { image: '/images/cities/gafsa-2.jpg', tag: 'Bikepacking', title: 'Gafsa to Tozeur by Bike: Roman Pools, Oases and Gorges', date: '02 April 2026', comments: 3 },
]

// [label, href] pairs, mirroring the footer of aaslema-new
export const footerColumns = [
  { title: 'Explore', links: [['Destinations', '/#destinations'], ['Trip planner', '#'], ['Community', '/#blog']] },
  { title: 'Travel Styles', links: [['Backpacking', '#'], ['Bikepacking', '#'], ['History', '#']] },
  { title: 'About', links: [['Contact', '/contact'], ['FAQ', '/faq'], ['Legal notice', '#'], ['Privacy', '#']] },
]

export const images = {
  about: '/images/about-traveler.png',
  features: '/images/hostel/event1.jpg',
  app: ['/images/hostel/sidibousaid.jpg', '/images/hostel/dougga.jpg'],
  footer: '/images/cities/ben-arous-2.jpg',
}

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
  ['Destinations', '/destinations'],
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
  { id: 'tunis', name: 'Tunis', vibe: 'Cosmopolitan & Historic', image: '/images/cities/tunis-1.jpg' },
  { id: 'sousse', name: 'Sousse', vibe: 'Energetic & Mediterranean', image: '/images/cities/sousse-1.jpg' },
  { id: 'tataouine', name: 'Tataouine', vibe: 'Sci-Fi & Ancient', image: '/images/cities/tataouine-1.jpg' },
  { id: 'jendouba', name: 'Jendouba', vibe: 'Alpine & Coastal', image: '/images/cities/jendouba-1.jpg' },
  { id: 'kairouan', name: 'Kairouan', vibe: 'Spiritual & Ancient', image: '/images/cities/kairouan-1.jpg' },
]

export const popularDestinations = [
  { id: 'mahdia', image: '/images/cities/mahdia-2.jpg', name: 'Mahdia', info: 'Poetic & Nautical' },
  { id: 'sousse', image: '/images/cities/sousse-2.jpg', name: 'Sousse', info: 'Energetic & Mediterranean' },
  { id: 'monastir', image: '/images/cities/monastir-2.jpg', name: 'Monastir', info: 'Regal & Coastal' },
  { id: 'kef', image: '/images/cities/kef-2.jpg', name: 'Le Kef', info: 'Highland & Resolute' },
  { id: 'sfax', image: '/images/cities/sfax-2.jpg', name: 'Sfax', info: 'Authentic & Industrious' },
  { id: 'bizerte', image: '/images/cities/bizerte-2.jpg', name: 'Bizerte', info: 'Maritime & Nautical' },
]

export const features = [
  { icon: 'map', title: 'City Guides', text: 'Guides for all 24 governorates, from the medinas of the north to the ksour of the south.' },
  { icon: 'route', title: 'AI Trip Planner', text: 'Pick your cities and days, on foot or by bike, and get a route you can save as a PDF.' },
  { icon: 'users', title: 'Community', text: 'Travelers who have ridden the route before you, sharing tips and hidden gems.' },
  { icon: 'bus', title: 'Local Transport', text: 'How louages, trains and buses work, so getting between towns is the easy part.' },
]

export const travelStyles = [
  { icon: 'backpack', title: 'Backpacking', text: 'Louages between towns, guesthouses in the medina, and the cheapest way to eat well.' },
  { icon: 'bike', title: 'Bikepacking', text: 'Coastal roads, mountain passes in the north-west and gravel tracks into the Sahara.' },
  { icon: 'landmark', title: 'History', text: 'Carthage, El Jem, the Kairouan mosque and the troglodyte homes of Matmata.' },
]

export const testimonials = [
  { quote: 'I rode from Tunis down to Tozeur with the bikepacking route from the trip planner. The city guides told me where to sleep and where the water stops were, and the gravel tracks into the Sahara were unreal.', name: 'Randall Vasquez', role: 'Bikepacker', avatar: img('1500648767791-00dcc994a43e', 120) },
  { quote: 'Louages scared me at first, but the guide explained exactly how they work. Two weeks of medinas, guesthouses and street food on a backpacker budget, and I never felt lost.', name: 'Sarah Mitchell', role: 'Backpacker', avatar: img('1494790108377-be9c29b29330', 120) },
  { quote: 'We followed the history itinerary: Carthage, El Jem, the Great Mosque of Kairouan and Matmata. Everything was paced well, and the community tips on where to eat were spot on.', name: 'James Carter', role: 'History Traveler', avatar: img('1507003211169-0a1dd7228f2d', 120) },
  { quote: 'I travel solo a lot and rarely feel this looked after. I met other travelers through the community, shared a louage to Tataouine, and slept in a ksar under the stars.', name: 'Emma Laurent', role: 'Solo Traveler', avatar: img('1438761681033-6461ffad8d80', 120) },
]

export const ctas = [
  // Festivals from each city's events in cities.js
  { id: 'tozeur', image: '/images/cities/tozeur-2.jpg', tag: 'Tozeur', title: 'International Oasis Festival' },
  { id: 'gabes', image: '/images/cities/gabes-2.jpg', tag: 'Gabès', title: 'Gabès International Film Festival' },
  { id: 'zaghouan', image: '/images/cities/zaghouan-2.jpg', tag: 'Zaghouan', title: 'Rose and Eglantine Festival' },
]

export const posts = [
  { image: '/images/cities/jendouba-2.jpg', tag: 'History', title: 'Bulla Regia: The Roman Villas Built Underground in Jendouba', date: '25 February 2026', comments: 5 },
  { image: '/images/cities/medenine-2.jpg', tag: 'Backpacking', title: 'Sleeping in a Ksar: A Backpacker’s Guide to Medenine', date: '18 March 2026', comments: 8 },
  { image: '/images/cities/gafsa-2.jpg', tag: 'Bikepacking', title: 'Gafsa to Tozeur by Bike: Roman Pools, Oases and Gorges', date: '02 April 2026', comments: 3 },
]

// [label, href] pairs, mirroring the footer of aaslema-new
export const footerColumns = [
  { title: 'Explore', links: [['Destinations', '/destinations'], ['Trip planner', '#'], ['Community', '/#blog']] },
  { title: 'Travel Styles', links: [['Backpacking', '#'], ['Bikepacking', '#'], ['History', '#']] },
  { title: 'About', links: [['Contact', '/contact'], ['FAQ', '/faq'], ['Legal notice', '#'], ['Privacy', '#']] },
]

export const images = {
  about: '/images/about-traveler.png',
  features: '/images/hostel/event1.jpg',
  footer: '/images/cities/ben-arous-2.jpg',
}

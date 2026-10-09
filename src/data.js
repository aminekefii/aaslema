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

export const navLinks = ['Home', 'Tours', 'Destinations', 'Hotels', 'Blog', 'Contact']

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

export const hotels = [
  { image: '/images/hostel/common1.jpg', location: 'Ao Nang, Thailand', title: 'Brown Bench Poolside Resort & Spa', price: 85, rating: 4.8 },
  { image: '/images/hostel/common2.jpg', location: 'Kigali, Rwanda', title: 'Green Gardens Lakeview Hotel', price: 92, rating: 4.7 },
  { image: '/images/hostel/common3.jpg', location: 'Phuket, Thailand', title: 'Sunset Deck Beach Villas', price: 110, rating: 4.9 },
  { image: '/images/hostel/outdoors.jpg', location: 'Marrakech, Morocco', title: 'Palm Courtyard Boutique Riad', price: 78, rating: 4.8 },
]

export const appPerks = ['Experienced Agency', 'Professional Team', 'Low Cost Travel', 'Online Support 24/7']

export const testimonials = [
  { quote: 'Our trip was perfect from start to finish. They handled every transfer and booking, and even suggested experiences we never would have found ourselves.', name: 'Randall Vasquez', role: 'Graphic Designer', avatar: img('1500648767791-00dcc994a43e', 120) },
  { quote: 'The itinerary was paced just right. Local guides were friendly and knowledgeable, and support answered within minutes when our flight changed.', name: 'Sarah Mitchell', role: 'Product Manager', avatar: img('1494790108377-be9c29b29330', 120) },
  { quote: 'Best value we have ever had on a family holiday. The hotel picks were spot on and the kids still talk about the boat day.', name: 'James Carter', role: 'Architect', avatar: img('1507003211169-0a1dd7228f2d', 120) },
  { quote: 'I travel solo a lot and rarely feel this looked after. Clear plans, no surprises, and a few lovely ones.', name: 'Emma Laurent', role: 'Photographer', avatar: img('1438761681033-6461ffad8d80', 120) },
]

export const ctas = [
  { image: '/images/cities/tozeur-2.jpg', tag: 'Tent Camping', title: 'Explore the world’s best campsites' },
  { image: '/images/cities/gabes-2.jpg', tag: 'Sea Beach', title: 'The clearest beaches in Thailand' },
  { image: '/images/cities/zaghouan-2.jpg', tag: 'Water Falls', title: 'Hidden waterfalls of Bali, Indonesia' },
]

export const posts = [
  { image: '/images/cities/jendouba-2.jpg', tag: 'Travel', title: 'The Ultimate Guide to Planning Your Dream Vacation', date: '25 February 2026', comments: 5 },
  { image: '/images/cities/medenine-2.jpg', tag: 'Adventure', title: 'Unforgettable Adventures for Your Travel Bucket List', date: '18 March 2026', comments: 8 },
  { image: '/images/cities/gafsa-2.jpg', tag: 'Tips', title: 'Packing Light: What Actually Belongs in Your Bag', date: '02 April 2026', comments: 3 },
]

export const footerColumns = [
  { title: 'Services', links: ['Best Tour Guide', 'Tour Booking', 'Hotel Booking', 'Ticket Booking', 'Rental Services'] },
  { title: 'Company', links: ['About Company', 'Community Blog', 'Jobs and Careers', 'Latest News', 'Contact Us'] },
  { title: 'Destinations', links: ['African Safaris', 'Alaska & Canada', 'South America', 'Middle East', 'Southeast Asia'] },
]

export const images = {
  about: '/images/about-traveler.png',
  features: '/images/hostel/event1.jpg',
  app: ['/images/hostel/sidibousaid.jpg', '/images/hostel/dougga.jpg'],
  testimonial: '/images/hostel/hero.jpg',
  footer: '/images/cities/ben-arous-2.jpg',
}

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

export const heroImage = img('1476514525535-07fb3b4ae5f1', 1920)

export const tours = [
  { image: img('1552832230-c0197dd311b5'), location: 'Rome, Italy', title: 'Ancient Rome & the Colosseum Walking Tour', meta: '3 days 2 nights - Couple', price: 58, rating: 4.8 },
  { image: img('1533105079780-92b9be482077'), location: 'Santorini, Greece', title: 'Whitewashed Cliffs and Caldera Sunset Cruise', meta: '4 days 3 nights - Couple', price: 63, rating: 4.9 },
  { image: img('1530789253388-582c481c54b0'), location: 'Cappadocia, Turkey', title: 'Hot Air Balloons Over the Fairy Chimneys', meta: '3 days 2 nights - Family', price: 42, rating: 4.7 },
  { image: img('1539650116574-8efeb43e2750'), location: 'Giza, Egypt', title: 'Pyramids, Sphinx and the Nile by Felucca', meta: '5 days 4 nights - Group', price: 52, rating: 4.8 },
]

export const popularDestinations = [
  { image: img('1506929562872-bb421503ef21', 900), name: 'Maldives Islands', info: '5352+ tours & 856+ activities' },
  { image: img('1499856871958-5b9627545d1a', 900), name: 'Paris, France', info: '4120+ tours & 612+ activities' },
  { image: img('1537996194471-e657df975ab4', 900), name: 'Bali, Indonesia', info: '3870+ tours & 540+ activities' },
  { image: img('1544735716-392fe2489ffa', 900), name: 'Mount Everest, Nepal', info: '980+ tours & 210+ activities' },
  { image: img('1512453979798-5ea266f8880c', 900), name: 'Dubai, UAE', info: '2950+ tours & 430+ activities' },
  { image: img('1518548419970-58e3b4079ab2', 900), name: 'Tanah Lot, Bali', info: '1640+ tours & 305+ activities' },
]

export const features = [
  { icon: 'tent', title: 'Tent Camping', text: 'Sleep under the stars and wake up surrounded by nature.' },
  { icon: 'sailboat', title: 'Kayaking', text: 'Paddle hidden coves and calm lakes at your own pace.' },
  { icon: 'bike', title: 'Mountain Biking', text: 'Ride trails that test your legs and reward your eyes.' },
  { icon: 'fish', title: 'Fishing & Boat', text: 'Slow days on the water with a local skipper.' },
]

export const hotels = [
  { image: img('1566073771259-6a8506099945'), location: 'Ao Nang, Thailand', title: 'Brown Bench Poolside Resort & Spa', price: 85, rating: 4.8 },
  { image: img('1571896349842-33c89424de2d'), location: 'Kigali, Rwanda', title: 'Green Gardens Lakeview Hotel', price: 92, rating: 4.7 },
  { image: img('1582719508461-905c673771fd'), location: 'Phuket, Thailand', title: 'Sunset Deck Beach Villas', price: 110, rating: 4.9 },
  { image: img('1551882547-ff40c63fe5fa'), location: 'Marrakech, Morocco', title: 'Palm Courtyard Boutique Riad', price: 78, rating: 4.8 },
]

export const appPerks = ['Experienced Agency', 'Professional Team', 'Low Cost Travel', 'Online Support 24/7']

export const testimonials = [
  { quote: 'Our trip was perfect from start to finish. They handled every transfer and booking, and even suggested experiences we never would have found ourselves.', name: 'Randall Vasquez', role: 'Graphic Designer', avatar: img('1500648767791-00dcc994a43e', 120) },
  { quote: 'The itinerary was paced just right. Local guides were friendly and knowledgeable, and support answered within minutes when our flight changed.', name: 'Sarah Mitchell', role: 'Product Manager', avatar: img('1494790108377-be9c29b29330', 120) },
  { quote: 'Best value we have ever had on a family holiday. The hotel picks were spot on and the kids still talk about the boat day.', name: 'James Carter', role: 'Architect', avatar: img('1507003211169-0a1dd7228f2d', 120) },
  { quote: 'I travel solo a lot and rarely feel this looked after. Clear plans, no surprises, and a few lovely ones.', name: 'Emma Laurent', role: 'Photographer', avatar: img('1438761681033-6461ffad8d80', 120) },
]

export const ctas = [
  { image: img('1504280390367-361c6d9f38f4', 900), tag: 'Tent Camping', title: 'Explore the world’s best campsites' },
  { image: img('1507525428034-b723cf961d3e', 900), tag: 'Sea Beach', title: 'The clearest beaches in Thailand' },
  { image: img('1432405972618-c60b0225b8f9', 900), tag: 'Water Falls', title: 'Hidden waterfalls of Bali, Indonesia' },
]

export const posts = [
  { image: img('1488646953014-85cb44e25828'), tag: 'Travel', title: 'The Ultimate Guide to Planning Your Dream Vacation', date: '25 February 2026', comments: 5 },
  { image: img('1544551763-46a013bb70d5'), tag: 'Adventure', title: 'Unforgettable Adventures for Your Travel Bucket List', date: '18 March 2026', comments: 8 },
  { image: img('1473496169904-658ba7c44d8a'), tag: 'Tips', title: 'Packing Light: What Actually Belongs in Your Bag', date: '02 April 2026', comments: 3 },
]

export const footerColumns = [
  { title: 'Services', links: ['Best Tour Guide', 'Tour Booking', 'Hotel Booking', 'Ticket Booking', 'Rental Services'] },
  { title: 'Company', links: ['About Company', 'Community Blog', 'Jobs and Careers', 'Latest News', 'Contact Us'] },
  { title: 'Destinations', links: ['African Safaris', 'Alaska & Canada', 'South America', 'Middle East', 'Southeast Asia'] },
]

export const images = {
  about: '/images/about-traveler.png',
  features: img('1544191696-102dbdaeeaa0', 900),
  app: [img('1530789253388-582c481c54b0', 400), img('1533105079780-92b9be482077', 400)],
  testimonial: img('1503220317375-aaad61436b1b', 900),
  footer: img('1509316785289-025f5b846b35', 1920),
  avatars: [img('1500648767791-00dcc994a43e', 100), img('1494790108377-be9c29b29330', 100), img('1507003211169-0a1dd7228f2d', 100)],
}

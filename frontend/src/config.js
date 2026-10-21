// Edit this one file to change shop details everywhere (footer, About, Contact, map, notice).
export const SHOP = {
  name: 'Kaya Global',
  tagline: 'Everyday groceries from stores you can trust.',
  address: 'Periyapatti post, Udumalai Tk, Tirupur',
  mapQuery: 'Udumalaipet, Tamil Nadu',          // Google Maps search text or "lat,lng"
  phone: '+91 00000 00000',
  email: 'kayatradersz@gmail.com',
  hours: 'Mon-Sun, 9:00 AM - 8:00 PM',
  deliveryRadiusKm: 15,
  social: {                                   // paste your real page links
    facebook: '#', instagram: '#', x: '#', youtube: '#', whatsapp: '#',
  },
};

// Shown once after sign-in. The first line is from your brief; edit the rest to match your policy.
export const TERMS = [
  `Free delivery is available only within ${SHOP.deliveryRadiusKm} km of the store. Beyond ${SHOP.deliveryRadiusKm} km, delivery charges are confirmed by the store.`,
  'All prices shown include GST. The bill shows CGST + SGST for orders within the store\u2019s state and IGST for other states.',
  'You can save up to 3 delivery addresses. Please check your address and pincode before paying.',
  'Bills and packing lists are emailed to you and to the store after payment.',
];

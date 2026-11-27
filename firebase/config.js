// Firebase web app config for spotter-6d902 (Firebase console → Project settings → Your apps → SDK setup and configuration → Config).
// These values are meant to be public: what keeps data private is firestore.rules, not this file.
window.SPOTTER_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCVTk6bnL_gi4h5AfpYtqmgIE0xOdzfthg",
  authDomain: "spotter-6d902.web.app",   // the site's own address: https://spotter-6d902.web.app/__/auth/handler is on the OAuth client's redirect list
  projectId: "spotter-6d902",
  storageBucket: "spotter-6d902.firebasestorage.app",
  messagingSenderId: "23442348183",
  appId: "1:23442348183:web:db0f58cea5aa2bb68fb1d2",
};

// Chalkbook Pro (one-time unlock through Stripe). price is the label shown in the app; the amount actually charged is
// PRO_PRICE_CENTS in the backend (default 1999), so change both together. Set onSale to true once Stripe and the
// backend are set up (see PAYMENTS.md); until then the app says Pro is coming soon.
window.SPOTTER_PRO = {
  price: "$19.99",
  onSale: false,
};

// Sign-in options shown on the sign-in screen. Google is always on.
// email: needs Email/Password switched on in Firebase console → Authentication → Sign-in method.
// apple: needs an Apple Developer account and the Apple steps in SETUP.md; leave false until those are done.
window.SPOTTER_SIGNIN = {
  email: true,
  apple: false,
};

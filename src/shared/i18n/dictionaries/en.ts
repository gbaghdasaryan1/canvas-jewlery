/**
 * English dictionary — the canonical shape. `Dict = typeof en`, so ru/hy must
 * match this structure exactly (TypeScript enforces it). Interpolated strings
 * are functions so each language controls its own word order.
 */
export const en = {
  langName: "English",

  nav: {
    how: "How it's made",
    materials: "Materials",
    gallery: "Gallery",
    faq: "FAQ",
    designYours: "Design yours",
    home: "Home",
  },

  promos: [
    "Handcrafted to order — each piece is unique to your place",
    "Complimentary insured shipping worldwide",
    "Recycled precious metals · 30-day returns",
  ],

  hero: {
    eyebrow: "Bespoke topographic jewelry",
    title: { l1: "Wear the Place", l2: "That Made ", em: "You" },
    lead:
      "We turn the real topography of a place you love — a summit, a coastline, a city block — into a cast-metal piece you can wear. You design it in about a minute; we hand-finish it in recycled silver, gold, or platinum.",
    ctaPrimary: "Design yours — free to try",
    ctaSecondary: "See the gallery",
    trust: [
      "Milled from real elevation data",
      "Recycled silver, gold & platinum",
      "Insured worldwide shipping",
    ],
  },

  trust: [
    { title: "Real elevation data", body: "Milled from true topographic data — never a sketch." },
    { title: "Recycled precious metals", body: "Cast in reclaimed silver, gold & platinum." },
    { title: "Made to order", body: "Cast for one place, just for you. 3–4 weeks." },
    { title: "Shipped & guaranteed", body: "Insured worldwide shipping · 30-day returns." },
  ],

  story: {
    eyebrow: "The idea behind Cairn",
    title: "Every Place Tells a Story",
    opening: "Some places change our lives.",
    lines: ["A first date.", "A wedding.", "A childhood home.", "A dream vacation.", "A mountain you conquered."],
  },

  occasions: {
    eyebrow: "A gift they'll keep",
    title: "Made for the moments that matter",
    sub: "A place holds a memory better than any charm. Give one back — or keep it for yourself.",
    items: [
      { label: "Anniversaries", line: "The city where you met — worn close." },
      { label: "Engagements", line: "The peak you proposed on, in metal." },
      { label: "In memory", line: "A place that still means home." },
      { label: "Milestones", line: "The summit you finally reached." },
    ],
  },

  how: {
    eyebrow: "How it's made",
    title: "From elevation to heirloom",
    steps: [
      { n: "01", title: "You choose the place", body: "Anywhere with real relief. We pull topographic elevation for the exact patch you frame on the map." },
      { n: "02", title: "We mill the mountains", body: "The heightfield is wrapped into a band and CNC-cut in wax, preserving every ridge and valley at wearable scale." },
      { n: "03", title: "Cast in precious metal", body: "Lost-wax cast in recycled gold, silver or platinum, then hand-finished. A summit you can hold." },
    ],
  },

  collections: {
    eyebrow: "Collections",
    title: "Choose your form",
    sub: "Every piece starts from the same idea — a real place — and takes the shape that suits it.",
    link: "Design this →",
    options: [
      { title: "Mountains Plaque", blurb: "A clean rectangular relief of your landscape." },
      { title: "Round Locket", blurb: "A soft disc of mountains or coastline." },
    ],
  },

  materials: {
    eyebrow: "Materials",
    title: "Choose your metal",
    sub: "Every piece is cast in recycled precious metal, then hand-finished. Your exact price updates live as you design — no surprises.",
    cta: "See your price — design yours",
    metals: [
      { name: "Recycled sterling silver", note: "Our signature", blurb: "Bright, cool and everyday-wearable. The most accessible way to start." },
      { name: "18k recycled gold", note: "Warm heirloom", blurb: "A softer, warmer light on every ridge — for a piece meant to be passed on." },
      { name: "Platinum", note: "Forever", blurb: "The densest, most durable finish we cast. Understated and permanent." },
    ],
  },

  gallery: {
    eyebrow: "Gallery",
    title: "Places people are wearing",
    sub: "A few of the landscapes recently turned into keepsakes.",
    madeToOrder: "made to order",
    designLike: (place: string) => `Design a piece like ${place}`,
  },

  testimonials: {
    eyebrow: "Loved & worn",
    title: "Kept close, every day",
    sub: "The pieces that mean the most are the ones tied to a place.",
    quotes: [
      { body: "I gave my wife the mountain we hiked on our honeymoon. She hasn't taken it off since.", name: "Daniel R.", place: "Interlaken piece" },
      { body: "It's the only jewelry I own that means something. People always ask about it.", name: "Mariam A.", place: "Yerevan skyline" },
      { body: "Ordered the coastline where we got engaged. The detail is unreal — every cove is there.", name: "Sophie L.", place: "Amalfi coast" },
    ],
  },

  faq: {
    eyebrow: "Good to know",
    title: "Questions, answered",
    items: [
      { q: "How is each piece made?", a: "You frame a place on a real map. We pull its true elevation, turn that heightfield into a wearable relief, cast it in recycled precious metal by lost-wax casting, and hand-finish it." },
      { q: "What does it cost?", a: "Your exact price appears live as you design — it depends on the size and the metal you choose. Recycled sterling silver is the most accessible option; gold and platinum cost more." },
      { q: "How long does it take to arrive?", a: "Each piece is made to order in about 3–4 weeks, then shipped worldwide, fully insured." },
      { q: "Can I choose any place on Earth?", a: "Almost anywhere with real relief — a mountain, a coastline, a lake, or a whole city block. If it has topography, we can cast it." },
      { q: "Which metals can I choose?", a: "Recycled sterling silver, 18k recycled gold, and platinum. All are reclaimed, not newly mined." },
      { q: "What if it isn't right?", a: "We offer 30-day returns, and shipping is insured both ways. Designing is always free — you only pay when you order." },
    ],
  },

  final: {
    eyebrow: "Start now",
    title: "Your place, made to keep.",
    sub: "Designing is free and takes about a minute. You only pay when you order.",
    cta: "Design yours",
    guarantee: ["Made to order in 3–4 weeks", "Insured worldwide shipping", "30-day returns"],
  },

  footer: {
    tagline: "Bespoke topographic jewelry · made to order",
    mapData: "Map data © OpenStreetMap contributors",
  },

  designer: {
    modeMountains: "Mountains",
    modeMaps: "Maps",
    // caption above the 3D preview
    previewCaption: (form: string, type: string, metal: string) => `Your ${form} ${type} · ${metal}`,
    skylineCaption: (type: string, metal: string) => `Your skyline ${type} · ${metal}`,
    madeToOrder: "made to order in 3–4 weeks",
    priceLabel: "price",
    order: "Order this piece",
    downloadStl: "Download STL",
    readingMountains: "Reading mountains…",
    readingCity: "Reading the city…",
    reRead: "↻ Re-read mountains",
    noCity: "No buildings or streets here — try a city spot.",
    fetchingOsm: "Fetching buildings & streets from OpenStreetMap…",
    osmBusy: "OpenStreetMap is busy — some data may be missing. Try a smaller area or re-pick the spot.",
    stlPreview: "Preview",
    stlShow: "Show",
    stlHide: "Hide",
    noMesh: "No mesh yet",
    mapLabel: "Map · drag to reposition",
    cityMapLabel: "City map · drag to reposition",
    customLocation: "Custom location",

    step1MountainsTitle: "Choose your place",
    step1MountainsHint: "Search a spot or pick a favorite, then drag the pin to frame it.",
    step1CityTitle: "Choose your city",
    step1CityHint: "Search a city or pick a favorite, then drag the pin onto a block you love.",
    step2Title: "Shape & finish",
    step2MountainsHint: "Pick how it's worn and its form, then fine-tune the relief.",
    step2CityHint: "Choose what to show, its form, then fine-tune the relief.",

    searchMountainsPlaceholder: "Search a place — e.g. Matterhorn, Yosemite Valley…",
    searchCityPlaceholder: "Search a city — e.g. Yerevan, Manhattan, Hong Kong…",
    presetPrompt: "Jump to a landmark…",
    find: "Find",
    searchLoading: "Map is still loading — try again in a moment.",
    searchNoResult: (term: string) => `No place found for “${term}”.`,

    wornAs: "Worn as",
    form: "Form",
    renderLayers: "Render layers",
    hangingPoint: "Hanging point",
    ringOrientation: "Ring orientation",
    reliefDepth: "Relief depth",
    sampleArea: "Sample area",
    engravingBack: "Engraving (back)",
    engravingInside: "Engraving (inside)",
    engravingPlaceholder: "Add a name, date, or message",

    jewelry: { pendant: "Pendant", ring: "Ring", bracelet: "Bracelet" },
    shapes: { rectangle: "Rectangle", circle: "Circle" },
    // Caption vocabulary (differs from the control labels above).
    formName: { rectangle: "plaque", circle: "disc", heart: "heart" },
    layers: { all: "All", buildings: "Buildings", streets: "Streets" },
    metals: { silver: "Sterling silver", gold: "Gold", platinum: "Platinum" },
    // the 4 compass words used by the hang-point button
    dir: { top: "top", right: "right", bottom: "bottom", left: "left" },
    mm: "mm",
    km: "km",
  },

  order: {
    eyebrow: "Order",
    verifyEyebrow: "Verify",
    close: "Close",
    title: "Confirm your number",
    summary: (place: string, form: string, metal: string) => `Ordering your ${place} ${form} in ${metal}.`,
    skylineSummary: (place: string, form: string, metal: string) => `Ordering your ${place} skyline ${form} in ${metal}.`,
    fallbackSummary: "We'll text you a code to verify it's really you.",
    phoneLabel: "Phone number",
    sendCode: "Send code",
    sending: "Sending…",
    enterCodeTitle: "Enter the code",
    sentTo: "Sent to",
    change: "Change",
    codeLabel: "6-digit code",
    verifyOrder: "Verify & place order",
    placing: "Placing order…",
    resend: "Resend code",
    resendIn: (s: number) => `Resend code in ${s}s`,
    doneTitle: "Order received",
    doneBody: "Thank you — we've got your piece and your number. Our studio will reach out shortly to confirm details and payment.",
    done: "Done",
    errValidPhone: "Enter a valid phone number.",
    errSendFailed: "Couldn't send the code. Try again.",
    errEnterCode: "Enter the code we sent you.",
    errBadCode: "That code isn't right. Check it and try again.",
    errNotReady: "Your design isn't ready yet — close this and try again in a moment.",
    errOrderFailed: "Couldn't place the order. Try again.",
    errRateLimit: "Too many attempts — wait a minute, then try again.",
    errServer: "Our studio server had a problem. Please try again.",
    errNetwork: "Can't reach the server. Check your connection and try again.",
  },
};

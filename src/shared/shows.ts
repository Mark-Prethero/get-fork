import { CATALOGUE_VERSION } from "./build.ts";

export interface Show {
  id: string;
  title: string;
  genre: "comedy" | "musical" | "play" | "drama";
  tonight: boolean;
  whenLabel: string;
  time: string;
  priceGbp: number;
  runtimeMins: number;
  minAge: number;
  dateSuitable: boolean;
  vibeTags: string[];
  description: string;
  posterColour: string;
  imageUrl?: string;
  sourceUrl?: string;
}

export { CATALOGUE_VERSION };

/** Real tickadoo show identities and artwork with illustrative scenario details, not live inventory. */
export const shows: Show[] = [
  {
    "id": "the-play-that-goes-wrong",
    "title": "The Play That Goes Wrong",
    "genre": "comedy",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 29,
    "runtimeMins": 125,
    "minAge": 8,
    "dateSuitable": true,
    "vibeTags": [
      "laugh-out-loud",
      "slapstick"
    ],
    "description": "A murder mystery unravels as everything goes wrong for an amateur theatre company.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/7a37152cfa8e7c6cf04195fbc7c8ee90-3032-london-the-play-that-goes-wrong-01.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/the-play-that-goes-wrong-tickets"
  },
  {
    "id": "the-book-of-mormon",
    "title": "The Book of Mormon",
    "genre": "musical",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 76,
    "runtimeMins": 145,
    "minAge": 16,
    "dateSuitable": true,
    "vibeTags": [
      "laugh-out-loud",
      "satirical"
    ],
    "description": "Two young missionaries find themselves far from home in a boldly irreverent musical comedy.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/OTUOzPR9JgfPlBcKXAps5jb3w.png",
    "sourceUrl": "https://www.tickadoo.com/london/the-book-of-mormon-tickets"
  },
  {
    "id": "the-comedy-about-spies",
    "title": "The Comedy About Spies",
    "genre": "comedy",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 50,
    "runtimeMins": 150,
    "minAge": 12,
    "dateSuitable": true,
    "vibeTags": [
      "laugh-out-loud",
      "fast-paced"
    ],
    "description": "Cold War espionage turns into an escalating comedy of mistaken identities.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/a0503e02-1d95-4e40-9d61-7e4ee65e6c2e-1781769902889-417931.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/the-comedy-about-spies-tickets"
  },
  {
    "id": "faulty-towers-dining-experience",
    "title": "Faulty Towers The Dining Experience",
    "genre": "comedy",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 68,
    "runtimeMins": 120,
    "minAge": 14,
    "dateSuitable": true,
    "vibeTags": [
      "laugh-out-loud",
      "interactive"
    ],
    "description": "Basil, Sybil and Manuel bring their chaotic hotel service to an interactive dining show.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/QoJ0cT7TaSjEWomQwdZMKSusOOg.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/faulty-towers-dining-experience-tickets"
  },
  {
    "id": "mamma-mia",
    "title": "Mamma Mia!",
    "genre": "musical",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 45,
    "runtimeMins": 150,
    "minAge": 5,
    "dateSuitable": true,
    "vibeTags": [
      "laugh-out-loud",
      "feel-good"
    ],
    "description": "ABBA songs tell a sunny story of family, friendship and a wedding on a Greek island.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/f64ced57cd2042321178b25b5a7158a3-3026-london-mamma-mia--01.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/mamma-mia-tickets"
  },
  {
    "id": "wicked",
    "title": "Wicked",
    "genre": "musical",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 85,
    "runtimeMins": 150,
    "minAge": 8,
    "dateSuitable": true,
    "vibeTags": [
      "spectacle",
      "magical"
    ],
    "description": "Discover the story of two unlikely friends before they become the witches of Oz.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/wicked-tickets/wicked20-hero.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/wicked-tickets"
  },
  {
    "id": "matilda-the-musical",
    "title": "Matilda The Musical",
    "genre": "musical",
    "tonight": false,
    "whenLabel": "Tomorrow",
    "time": "14:00",
    "priceGbp": 40,
    "runtimeMins": 150,
    "minAge": 6,
    "dateSuitable": false,
    "vibeTags": [
      "laugh-out-loud",
      "family"
    ],
    "description": "An extraordinary girl uses her imagination and courage to stand up for herself.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/yIVILIe4ApDy6tUQO89i8Ch0kI.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/matilda-the-musical-tickets"
  },
  {
    "id": "the-mousetrap",
    "title": "The Mousetrap",
    "genre": "play",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 48,
    "runtimeMins": 130,
    "minAge": 12,
    "dateSuitable": true,
    "vibeTags": [
      "mystery",
      "witty"
    ],
    "description": "A group of strangers find themselves snowed in with a killer in Agatha Christie’s mystery.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/PV5Fa1ScrPsSZ8ip72gAjffxw8I.jpg",
    "sourceUrl": "https://www.tickadoo.com/london/the-mousetrap-tickets"
  },
  {
    "id": "witness-for-the-prosecution",
    "title": "Witness for the Prosecution",
    "genre": "drama",
    "tonight": true,
    "whenLabel": "Tonight",
    "time": "19:30",
    "priceGbp": 55,
    "runtimeMins": 140,
    "minAge": 12,
    "dateSuitable": true,
    "vibeTags": [
      "courtroom",
      "suspense"
    ],
    "description": "An Agatha Christie courtroom thriller puts the audience close to a murder trial.",
    "posterColour": "#171717",
    "imageUrl": "https://cdn.tickadoo.com/cdn-cgi/image/width=960,height=540,fit=cover,format=auto,quality=80/products/d0c5b40d-50d2-4569-8875-f5ce94ac5d35-1778640620993-390915.png",
    "sourceUrl": "https://www.tickadoo.com/london/witness-for-the-prosecution-tickets"
  }
];

export function showById(id: string): Show | undefined {
  return shows.find((show) => show.id === id);
}

export function formatGbp(amount: number): string {
  return `£${amount}`;
}

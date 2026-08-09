export interface CatalogItem {
  name: string;
  brand: string;
  category: string;
}

export const CATALOG_BRANDS = [
  "Coca-Cola", "Sprite", "Fanta", "Pepsi", "Mirinda", "7Up", "Mountain Dew", "Sting", 
  "Cola Next", "Fizzup Next", "Dare Next", "Amrat Cola", "Gourmet", "Star", "Sufi", 
  "Fresher", "Murree Brewery", "Daani", "Red Bull", "Power Horse", "Speed", "Monster", 
  "Epic", "Dark Dog", "Gatorade", "Tops", "Nestlé", "Aquafina", "Dasani", "Olper's", "Dayfresh"
];

export const CATALOG_CATEGORIES = [
  "Carbonated Drinks", "Energy Drinks", "Juices & Fruit Drinks", "Packaged Water", "Flavored Milk", "Snacks"
];

export const CATALOG_SUPPLIERS = [
  "Coca-Cola Beverages Pakistan Ltd / CCI",
  "Pepsi Cola International / Naubahar Bottling Co.",
  "Mezan Beverages",
  "Pakistan Mineral Water Bottling Plant",
  "Gourmet Pakistan",
  "Six B Food Industries",
  "Sufi Group",
  "Al-Hilal Industries",
  "Murree Brewery Co.",
  "Red Bull GmbH",
  "Monster Beverage",
  "Nestlé",
  "Shezan"
];

export const COMMON_SIZES = [
  "150ml", "200ml", "250ml", "300ml", "330ml", "345ml", "350ml", "473ml", "500ml", "770ml", "1L", "1.5L", "2L", "2.25L"
];

export const COMMON_PACKAGING = [
  "PET", "Can", "Bottle", "RB", "NRB", "Tetra Pack", "Pouch"
];

export const CATALOG_ITEMS: CatalogItem[] = [
  { name: "Coca-Cola", brand: "Coca-Cola", category: "Carbonated Drinks" },
  { name: "Coca-Cola Zero Sugar", brand: "Coca-Cola", category: "Carbonated Drinks" },
  { name: "Sprite", brand: "Sprite", category: "Carbonated Drinks" },
  { name: "Sprite Lemon-Mint", brand: "Sprite", category: "Carbonated Drinks" },
  { name: "Sprite Zero", brand: "Sprite", category: "Carbonated Drinks" },
  { name: "Fanta Orange", brand: "Fanta", category: "Carbonated Drinks" },
  { name: "Fanta Grape", brand: "Fanta", category: "Carbonated Drinks" },
  { name: "Pepsi", brand: "Pepsi", category: "Carbonated Drinks" },
  { name: "Pepsi Zero Sugar", brand: "Pepsi", category: "Carbonated Drinks" },
  { name: "Mirinda Orange", brand: "Mirinda", category: "Carbonated Drinks" },
  { name: "7Up", brand: "7Up", category: "Carbonated Drinks" },
  { name: "7Up Free", brand: "7Up", category: "Carbonated Drinks" },
  { name: "7Up Mint Lemonade", brand: "7Up", category: "Carbonated Drinks" },
  { name: "7Up Strawberry Lemonade", brand: "7Up", category: "Carbonated Drinks" },
  { name: "Mountain Dew", brand: "Mountain Dew", category: "Carbonated Drinks" },
  { name: "Sting Gold Rush", brand: "Sting", category: "Energy Drinks" },
  { name: "Sting Berry Blast", brand: "Sting", category: "Energy Drinks" },
  { name: "Sting Blue Thunder", brand: "Sting", category: "Energy Drinks" },
  { name: "Cola Next", brand: "Cola Next", category: "Carbonated Drinks" },
  { name: "Fizzup Next", brand: "Fizzup Next", category: "Carbonated Drinks" },
  { name: "Dare Next", brand: "Dare Next", category: "Carbonated Drinks" },
  { name: "Amrat Cola", brand: "Amrat Cola", category: "Carbonated Drinks" },
  { name: "Amrat Orange", brand: "Amrat Cola", category: "Carbonated Drinks" },
  { name: "Amrat Lemon-Lime", brand: "Amrat Cola", category: "Carbonated Drinks" },
  { name: "Gourmet Cola", brand: "Gourmet", category: "Carbonated Drinks" },
  { name: "Star Cola", brand: "Star", category: "Carbonated Drinks" },
  { name: "Sufi Cola", brand: "Sufi", category: "Carbonated Drinks" },
  { name: "Fresher Cola", brand: "Fresher", category: "Carbonated Drinks" },
  { name: "Murree Brewery - Big Apple", brand: "Murree Brewery", category: "Carbonated Drinks" },
  { name: "Murree Brewery - Bigg Lychee", brand: "Murree Brewery", category: "Carbonated Drinks" },
  { name: "Daani Mango", brand: "Daani", category: "Carbonated Drinks" },
  { name: "Red Bull Original", brand: "Red Bull", category: "Energy Drinks" },
  { name: "Red Bull Sugar-Free", brand: "Red Bull", category: "Energy Drinks" },
  { name: "Red Bull Red Edition", brand: "Red Bull", category: "Energy Drinks" },
  { name: "Power Horse", brand: "Power Horse", category: "Energy Drinks" },
  { name: "Speed", brand: "Speed", category: "Energy Drinks" },
  { name: "Monster Energy", brand: "Monster", category: "Energy Drinks" },
  { name: "Epic Stimulant Drink", brand: "Epic", category: "Energy Drinks" },
  { name: "Dark Dog", brand: "Dark Dog", category: "Energy Drinks" },
  { name: "Gatorade Lemon-Lime", brand: "Gatorade", category: "Energy Drinks" },
  { name: "Gatorade Tropical Fruit", brand: "Gatorade", category: "Energy Drinks" },
  { name: "Tops Mango", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Apple", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Guava", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Lychee", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Grape", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Anar", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Lemon", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Strawberry", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Pineapple", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Mix Fruit Punch", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Mojito", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Lemon Barley", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Ice Cream Soda", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Mango", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Apple", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Guava", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Peach", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Lychee", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Strawberry", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Orange & Mango", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Tangy Orange & Carrot", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Angoor", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Anaar", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Ice Tea Lemon", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Tops Fusion Coconut Water", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Frootopia Mango", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Frootopia Guava", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Frootopia Peach", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Frootopia Anaar", brand: "Tops", category: "Juices & Fruit Drinks" },
  { name: "Nestlé Pure Life", brand: "Nestlé", category: "Packaged Water" },
  { name: "Aquafina", brand: "Aquafina", category: "Packaged Water" },
  { name: "Dasani", brand: "Dasani", category: "Packaged Water" },
  { name: "Murree Sparkletts", brand: "Murree Brewery", category: "Packaged Water" }
];

export const getSizesForCategory = (category?: string) => {
  if (category === "Energy Drinks") return ["250ml", "300ml", "500ml", "1L", "1.5L"];
  if (category === "Carbonated Drinks") return ["250ml", "300ml", "330ml", "345ml", "500ml", "1L", "1.5L", "2.25L"];
  if (category === "Juices & Fruit Drinks") return ["200ml", "250ml", "1L"];
  if (category === "Packaged Water") return ["330ml", "500ml", "1.5L", "5L", "19L"];
  return COMMON_SIZES;
};

export const getPackagingForCategory = (category?: string) => {
  if (category === "Energy Drinks") return ["PET", "Can"];
  if (category === "Carbonated Drinks") return ["PET", "Bottle", "Can", "RB", "NRB"];
  if (category === "Juices & Fruit Drinks") return ["Tetra Pack", "Bottle", "PET"];
  if (category === "Packaged Water") return ["PET"];
  return COMMON_PACKAGING;
};

export const PACKAGING_SIZE_CONSTRAINTS: Record<string, string[]> = {
  "Can": ["150ml", "250ml", "330ml", "473ml"],
  "PET": ["300ml", "345ml", "350ml", "500ml", "1L", "1.5L", "2L", "2.25L", "5L"],
  "RB": ["250ml", "300ml", "350ml"],
  "NRB": ["250ml", "300ml", "350ml"],
  "Bottle": ["250ml", "300ml", "350ml", "500ml", "1L"],
  "Tetra Pack": ["200ml", "1L"],
  "Pouch": ["250ml"]
};

export const getValidSizesForPackaging = (packaging: string, baseOptions: string[]) => {
  if (!packaging || !PACKAGING_SIZE_CONSTRAINTS[packaging]) return baseOptions;
  const allowed = new Set(PACKAGING_SIZE_CONSTRAINTS[packaging]);
  return baseOptions.filter(size => allowed.has(size));
};

export const getValidPackagingForSize = (size: string, baseOptions: string[]) => {
  if (!size) return baseOptions;
  const allowedPkgs = Object.entries(PACKAGING_SIZE_CONSTRAINTS)
    .filter(([_, sizes]) => sizes.includes(size))
    .map(([pkg]) => pkg);
  
  if (allowedPkgs.length === 0) return baseOptions;
  const allowed = new Set(allowedPkgs);
  return baseOptions.filter(pkg => allowed.has(pkg));
};

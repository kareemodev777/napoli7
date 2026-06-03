import type { Category, Product } from "@/data/types/catalog";

export const CATEGORIES: Category[] = [
  {
    "id": "ajman-pizza",
    "label": "Ajman Pizza Collection",
    "description": "Neapolitan pizza reimagined with flavors inspired by Ajman and the cultures of the Emirates.",
    "position": 0
  },
  {
    "id": "italian-pizza",
    "label": "Italian Pizza Collection",
    "description": "Authentic Neapolitan-style classics with Italian ingredients and traditional craft.",
    "position": 1
  },
  {
    "id": "focaccia",
    "label": "Focaccia Sandwiches",
    "description": "Focaccia sandwiches made with Napoli 7 dough and premium fillings.",
    "position": 2
  },
  {
    "id": "dessert",
    "label": "Desserts",
    "description": "Sweet pizzas to finish.",
    "position": 3
  },
  {
    "id": "drinks",
    "label": "Drinks",
    "description": "Cold drinks to accompany your meal.",
    "position": 4
  }
];

export const PRODUCTS: Product[] = [
  {
    "id": "indian-spicy-chicken-kebab",
    "slug": "indian-spicy-chicken-kebab",
    "categoryId": "ajman-pizza",
    "name": "Indian - Spicy Chicken Kebab",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Extra virgin olive oil, Onion, Chicken kebab, Jalapeño, Ranch sauce.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": true,
    "isActive": true,
    "position": 0,
    "imageUrl": "/images/products/indian-spicy-chicken-kebab.jpg",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Chicken kebab",
        "extraPrice": 6.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 0.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "indian-paneer",
    "slug": "indian-paneer",
    "categoryId": "ajman-pizza",
    "name": "Indian - Paneer",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Paneer, Bell pepper, Onion.",
    "price": 38.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 38.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 25.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 1,
    "imageUrl": "/images/products/indian-paneer.png",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Paneer",
        "extraPrice": 5.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 1.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Sun-dried tomato",
        "extraPrice": 4.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "indian-vegan-tofu",
    "slug": "indian-vegan-tofu",
    "categoryId": "ajman-pizza",
    "name": "Indian - Vegan Tofu",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Vegan cheese, Onion, Fresh basil, Bell pepper, Tofu, Black olive, Tandoori sauce.",
    "price": 45.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 45.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 31.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 2,
    "imageUrl": "/images/products/indian-vegan-tofu.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Vegan cheese",
        "extraPrice": 9.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Tofu",
        "extraPrice": 3.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Tandoori sauce",
        "extraPrice": 0.0,
        "removable": true,
        "position": 7
      },
      {
        "ingredient": "Mushroom",
        "extraPrice": 2.0,
        "removable": false,
        "position": 8
      },
      {
        "ingredient": "Sun-dried tomato",
        "extraPrice": 4.0,
        "removable": false,
        "position": 9
      },
      {
        "ingredient": "Artichokes",
        "extraPrice": 2.0,
        "removable": false,
        "position": 10
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 11
      }
    ]
  },
  {
    "id": "pakistan-mutton-kebab",
    "slug": "pakistan-mutton-kebab",
    "categoryId": "ajman-pizza",
    "name": "Pakistan - Mutton Kebab",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Fresh basil, Oregano, Onion, Mutton kebab, Ranch sauce, Jalapeño.",
    "price": 45.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 45.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 32.0
      }
    ],
    "isVeg": false,
    "isSpicy": true,
    "isActive": true,
    "position": 3,
    "imageUrl": "/images/products/pakistan-mutton-kebab.png",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Oregano",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Mutton kebab",
        "extraPrice": 7.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 0.0,
        "removable": true,
        "position": 7
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 8
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 9
      }
    ]
  },
  {
    "id": "uae-camel-kebab",
    "slug": "uae-camel-kebab",
    "categoryId": "ajman-pizza",
    "name": "UAE - Camel Kebab",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Oregano, Onion, Ranch sauce, Camel meat, Jalapeño.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": true,
    "isActive": true,
    "position": 4,
    "imageUrl": "/images/products/uae-camel-kebab.jpg",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Oregano",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Camel meat",
        "extraPrice": 5.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 0.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 8
      }
    ]
  },
  {
    "id": "bangladesh-spicy-beef-kebab",
    "slug": "bangladesh-spicy-beef-kebab",
    "categoryId": "ajman-pizza",
    "name": "Bangladesh - Spicy Beef Kebab",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Ranch sauce, Fresh basil, Oregano, Jalapeño, Beef kebab.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 28.0
      }
    ],
    "isVeg": false,
    "isSpicy": true,
    "isActive": true,
    "position": 5,
    "imageUrl": "/images/products/bangladesh-spicy-beef-kebab.jpg",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Oregano",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 0.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Beef kebab",
        "extraPrice": 7.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 8
      }
    ]
  },
  {
    "id": "afghanistan-chicken-kebab",
    "slug": "afghanistan-chicken-kebab",
    "categoryId": "ajman-pizza",
    "name": "Afghanistan - Chicken Kebab",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Extra virgin olive oil, Onion, Chicken kebab, Ranch sauce.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 6,
    "imageUrl": "/images/products/afghanistan-chicken-kebab.jpg",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": null,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Chicken kebab",
        "extraPrice": 6.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "filipino-chicken-adobo",
    "slug": "filipino-chicken-adobo",
    "categoryId": "ajman-pizza",
    "name": "Filipino - Chicken Adobo",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Onion, Adobo sauce, Grilled chicken.",
    "price": 39.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 39.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 25.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 7,
    "imageUrl": "/images/products/filipino-chicken-adobo.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Adobo sauce",
        "extraPrice": null,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Grilled chicken",
        "extraPrice": 6.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 7
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 1.0,
        "removable": false,
        "position": 8
      }
    ]
  },
  {
    "id": "egyptian-merguez-egyptian-sausage",
    "slug": "egyptian-merguez-egyptian-sausage",
    "categoryId": "ajman-pizza",
    "name": "Egyptian - Merguez (Egyptian Sausage)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Onion, Merguez sausage.",
    "price": 36.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 36.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 24.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 8,
    "imageUrl": "/images/products/egyptian-merguez-egyptian-sausage.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Merguez sausage",
        "extraPrice": 5.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 1.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "ethiopian-kitfo",
    "slug": "ethiopian-kitfo",
    "categoryId": "ajman-pizza",
    "name": "Ethiopian - Kitfo",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Kitfo beef.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 9,
    "imageUrl": "/images/products/ethiopian-kitfo.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Kitfo beef",
        "extraPrice": 8.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Onion",
        "extraPrice": 1.0,
        "removable": false,
        "position": 4
      }
    ]
  },
  {
    "id": "american-legend-chicken",
    "slug": "american-legend-chicken",
    "categoryId": "ajman-pizza",
    "name": "American - Legend Chicken",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Extra virgin olive oil, Oregano, Jalapeño, Onion, Ranch sauce, Grilled chicken.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": true,
    "isActive": true,
    "position": 10,
    "imageUrl": "/images/products/american-legend-chicken.jpg",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Oregano",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Grilled chicken",
        "extraPrice": 6.0,
        "removable": true,
        "position": 7
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 8
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 9
      },
      {
        "ingredient": "Mushroom",
        "extraPrice": 2.0,
        "removable": false,
        "position": 10
      }
    ]
  },
  {
    "id": "american-pepperoni",
    "slug": "american-pepperoni",
    "categoryId": "ajman-pizza",
    "name": "American - Pepperoni",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Pepperoni.",
    "price": 38.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 38.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 25.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 11,
    "imageUrl": "/images/products/american-pepperoni.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Pepperoni",
        "extraPrice": 6.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 4
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Onion",
        "extraPrice": 1.0,
        "removable": false,
        "position": 6
      }
    ]
  },
  {
    "id": "american-hawaiian",
    "slug": "american-hawaiian",
    "categoryId": "ajman-pizza",
    "name": "American - Hawaiian",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Veal ham, Pineapple, Extra virgin olive oil, Fresh basil.",
    "price": 49.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 49.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 35.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 12,
    "imageUrl": "/images/products/american-hawaiian.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Veal ham",
        "extraPrice": 9.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Pineapple",
        "extraPrice": 2.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 1.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Mushroom",
        "extraPrice": 2.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "margherita",
    "slug": "margherita",
    "categoryId": "italian-pizza",
    "name": "Margherita",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Oregano, Extra virgin olive oil, Fresh basil.",
    "price": 28.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 28.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 19.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 0,
    "imageUrl": "/images/products/margherita.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Oregano",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Artichokes",
        "extraPrice": 2.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Sun-dried tomato",
        "extraPrice": 4.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "tonno-tuna",
    "slug": "tonno-tuna",
    "categoryId": "italian-pizza",
    "name": "Tonno (Tuna)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Extra virgin olive oil, Fresh basil, Oregano, Onion, Tuna.",
    "price": 43.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 43.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 1,
    "imageUrl": "/images/products/tonno-tuna.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Oregano",
        "extraPrice": 0.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Tuna",
        "extraPrice": 8.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 8
      },
      {
        "ingredient": "Mushroom",
        "extraPrice": 2.0,
        "removable": false,
        "position": 9
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 1.0,
        "removable": false,
        "position": 10
      }
    ]
  },
  {
    "id": "ortolana-vegetarian",
    "slug": "ortolana-vegetarian",
    "categoryId": "italian-pizza",
    "name": "Ortolana (Vegetarian)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Mushrooms, Eggplant, Sun-dried tomato, Artichokes, Black olive, Bell pepper.",
    "price": 41.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 41.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 27.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 2,
    "imageUrl": "/images/products/ortolana-vegetarian.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Mushrooms",
        "extraPrice": 2.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Eggplant",
        "extraPrice": 2.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Sun-dried tomato",
        "extraPrice": 2.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Artichokes",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 2.0,
        "removable": true,
        "position": 7
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": true,
        "position": 8
      },
      {
        "ingredient": "Onion",
        "extraPrice": 0.0,
        "removable": false,
        "position": 9
      }
    ]
  },
  {
    "id": "quattro-formaggi-four-cheese",
    "slug": "quattro-formaggi-four-cheese",
    "categoryId": "italian-pizza",
    "name": "Quattro Formaggi (Four Cheese)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Gorgonzola, Provolone, Parmesan, Fresh basil.",
    "price": 44.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 44.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 30.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 3,
    "imageUrl": "/images/products/quattro-formaggi-four-cheese.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Gorgonzola",
        "extraPrice": 4.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Provolone",
        "extraPrice": 3.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Parmesan",
        "extraPrice": 3.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Mushroom",
        "extraPrice": 2.0,
        "removable": false,
        "position": 6
      }
    ]
  },
  {
    "id": "frutti-di-mare-seafood-pizza",
    "slug": "frutti-di-mare-seafood-pizza",
    "categoryId": "italian-pizza",
    "name": "Frutti Di Mare (Seafood Pizza)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Garlic, Parsley, Seafood mix: mussels, clams, shrimp, calamari & octopus.",
    "price": 44.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 44.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 4,
    "imageUrl": "/images/products/frutti-di-mare-seafood-pizza.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Garlic",
        "extraPrice": null,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Parsley",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Seafood mix: mussels, clams, shrimp, calamari & octopus",
        "extraPrice": 8.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Onion",
        "extraPrice": 1.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Jalapeño",
        "extraPrice": 1.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "diavola-piccante-spicy-italian-beef-salami",
    "slug": "diavola-piccante-spicy-italian-beef-salami",
    "categoryId": "italian-pizza",
    "name": "Diavola Piccante (Spicy Italian Beef Salami)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Oregano, Spicy halal beef salami.",
    "price": 46.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 46.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 31.0
      }
    ],
    "isVeg": false,
    "isSpicy": true,
    "isActive": true,
    "position": 5,
    "imageUrl": "/images/products/diavola-piccante-spicy-italian-beef-salami.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Oregano",
        "extraPrice": null,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Spicy halal beef salami",
        "extraPrice": 9.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Onion",
        "extraPrice": 1.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "quattro-stagioni-four-seasons",
    "slug": "quattro-stagioni-four-seasons",
    "categoryId": "italian-pizza",
    "name": "Quattro Stagioni (Four Seasons)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Fresh basil, Artichokes, Mushrooms, Bell pepper, Veal ham.",
    "price": 49.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 49.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 34.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 6,
    "imageUrl": "/images/products/quattro-stagioni-four-seasons.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Artichokes",
        "extraPrice": 2.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Mushrooms",
        "extraPrice": 2.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Veal ham",
        "extraPrice": 9.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      },
      {
        "ingredient": "Onion",
        "extraPrice": 1.0,
        "removable": false,
        "position": 8
      },
      {
        "ingredient": "Bell pepper",
        "extraPrice": 1.0,
        "removable": false,
        "position": 9
      }
    ]
  },
  {
    "id": "mortadella-beef-ham",
    "slug": "mortadella-beef-ham",
    "categoryId": "italian-pizza",
    "name": "Mortadella (Beef Ham)",
    "nameIt": null,
    "description": "Cooking cream, Fior di latte mozzarella, Fresh basil, Mortadella, Pistachio.",
    "price": 49.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 49.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 34.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 7,
    "imageUrl": "/images/products/mortadella-beef-ham.jpg",
    "customizations": [
      {
        "ingredient": "Cooking cream",
        "extraPrice": 2.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Mortadella",
        "extraPrice": 10.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Pistachio",
        "extraPrice": 2.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Cherry tomato",
        "extraPrice": 3.0,
        "removable": false,
        "position": 5
      },
      {
        "ingredient": "Rocket",
        "extraPrice": 1.0,
        "removable": false,
        "position": 6
      }
    ]
  },
  {
    "id": "prosciutto-e-funghi-veal-ham-and-mushroom",
    "slug": "prosciutto-e-funghi-veal-ham-and-mushroom",
    "categoryId": "italian-pizza",
    "name": "Prosciutto e Funghi (Veal Ham & Mushroom)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Extra virgin olive oil, Fresh basil, Veal ham, Mushrooms.",
    "price": 52.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 52.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 36.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 8,
    "imageUrl": "/images/products/prosciutto-e-funghi-veal-ham-and-mushroom.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 3.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Veal ham",
        "extraPrice": 10.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Mushrooms",
        "extraPrice": 3.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Artichokes",
        "extraPrice": 2.0,
        "removable": false,
        "position": 6
      },
      {
        "ingredient": "Black olive",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "bresaola-beef-dry-ham",
    "slug": "bresaola-beef-dry-ham",
    "categoryId": "italian-pizza",
    "name": "Bresaola (Beef Dry Ham)",
    "nameIt": null,
    "description": "San Marzano tomato sauce, Fior di latte mozzarella, Extra virgin olive oil, Fresh basil, Bresaola, Parmesan, Rocket.",
    "price": 58.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 58.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 39.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 9,
    "imageUrl": "/images/products/bresaola-beef-dry-ham.jpg",
    "customizations": [
      {
        "ingredient": "San Marzano tomato sauce",
        "extraPrice": 4.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Fresh basil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Bresaola",
        "extraPrice": 12.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Parmesan",
        "extraPrice": 3.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Rocket",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Cherry tomato",
        "extraPrice": 3.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "focaccia-mortadella",
    "slug": "focaccia-mortadella",
    "categoryId": "focaccia",
    "name": "Focaccia Mortadella",
    "nameIt": null,
    "description": "Fior di latte mozzarella, Extra virgin olive oil, Salt, Rosemary, Mortadella, Pesto, Pistachio, Cherry tomato.",
    "price": 48.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 48.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 35.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 0,
    "imageUrl": "/images/products/focaccia-mortadella.jpg",
    "customizations": [
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 4.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Salt",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Rosemary",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Mortadella",
        "extraPrice": 6.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Pesto",
        "extraPrice": 2.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Pistachio",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Cherry tomato",
        "extraPrice": 2.0,
        "removable": true,
        "position": 7
      },
      {
        "ingredient": "Rocket",
        "extraPrice": 1.0,
        "removable": false,
        "position": 8
      }
    ]
  },
  {
    "id": "focaccia-veal-ham",
    "slug": "focaccia-veal-ham",
    "categoryId": "focaccia",
    "name": "Focaccia Veal Ham",
    "nameIt": null,
    "description": "Fior di latte mozzarella, Extra virgin olive oil, Salt, Rosemary, Veal ham, Cherry tomato, Ranch sauce.",
    "price": 42.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 42.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 29.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 1,
    "imageUrl": "/images/products/focaccia-veal-ham.jpg",
    "customizations": [
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 4.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Salt",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Rosemary",
        "extraPrice": 0.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Veal ham",
        "extraPrice": 9.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Cherry tomato",
        "extraPrice": 2.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      },
      {
        "ingredient": "Rocket",
        "extraPrice": 1.0,
        "removable": false,
        "position": 7
      }
    ]
  },
  {
    "id": "focaccia-bresaola",
    "slug": "focaccia-bresaola",
    "categoryId": "focaccia",
    "name": "Focaccia Bresaola",
    "nameIt": null,
    "description": "Fior di latte mozzarella, Extra virgin olive oil, Salt, Bresaola, Cherry tomato, Rocket, Ranch sauce.",
    "price": 46.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 46.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 32.0
      }
    ],
    "isVeg": false,
    "isSpicy": false,
    "isActive": true,
    "position": 2,
    "imageUrl": "/images/products/focaccia-bresaola.jpg",
    "customizations": [
      {
        "ingredient": "Fior di latte mozzarella",
        "extraPrice": 4.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Extra virgin olive oil",
        "extraPrice": 0.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Salt",
        "extraPrice": 0.0,
        "removable": true,
        "position": 2
      },
      {
        "ingredient": "Bresaola",
        "extraPrice": 10.0,
        "removable": true,
        "position": 3
      },
      {
        "ingredient": "Cherry tomato",
        "extraPrice": 2.0,
        "removable": true,
        "position": 4
      },
      {
        "ingredient": "Rocket",
        "extraPrice": 2.0,
        "removable": true,
        "position": 5
      },
      {
        "ingredient": "Ranch sauce",
        "extraPrice": 2.0,
        "removable": true,
        "position": 6
      }
    ]
  },
  {
    "id": "nutella-pizza",
    "slug": "nutella-pizza",
    "categoryId": "dessert",
    "name": "Nutella Pizza",
    "nameIt": null,
    "description": "Nutella cream, Chocolate.",
    "price": 19.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 19.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 13.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 0,
    "imageUrl": "/images/products/nutella-pizza.jpg",
    "customizations": [
      {
        "ingredient": "Nutella cream",
        "extraPrice": 5.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Chocolate",
        "extraPrice": 1.0,
        "removable": true,
        "position": 1
      },
      {
        "ingredient": "Sugar powder",
        "extraPrice": 1.0,
        "removable": false,
        "position": 2
      },
      {
        "ingredient": "Banana",
        "extraPrice": 1.0,
        "removable": false,
        "position": 3
      }
    ]
  },
  {
    "id": "lotus-pizza",
    "slug": "lotus-pizza",
    "categoryId": "dessert",
    "name": "Lotus Pizza",
    "nameIt": null,
    "description": "Lotus cream, Lotus biscuit.",
    "price": 19.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 19.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 13.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 1,
    "imageUrl": "/images/products/lotus-pizza.jpg",
    "customizations": [
      {
        "ingredient": "Lotus cream",
        "extraPrice": 4.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Lotus biscuit",
        "extraPrice": 2.0,
        "removable": true,
        "position": 1
      }
    ]
  },
  {
    "id": "pistachio-pizza",
    "slug": "pistachio-pizza",
    "categoryId": "dessert",
    "name": "Pistachio Pizza",
    "nameIt": null,
    "description": "Pistachio cream, Pistachio nuts.",
    "price": 19.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Medium",
        "detail": "Medium pizza",
        "price": 19.0
      },
      {
        "id": "small",
        "label": "Small",
        "detail": "Small pizza",
        "price": 13.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 2,
    "imageUrl": "/images/products/pistachio-pizza.jpg",
    "customizations": [
      {
        "ingredient": "Pistachio cream",
        "extraPrice": 4.0,
        "removable": true,
        "position": 0
      },
      {
        "ingredient": "Pistachio nuts",
        "extraPrice": 2.0,
        "removable": true,
        "position": 1
      }
    ]
  },
  {
    "id": "coca-cola",
    "slug": "coca-cola",
    "categoryId": "drinks",
    "name": "Coca-Cola",
    "nameIt": null,
    "description": "Coca-Cola drink.",
    "price": 4.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Regular",
        "detail": "",
        "price": 4.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 0,
    "imageUrl": "/images/products/coca-cola.jpg",
    "customizations": []
  },
  {
    "id": "coca-cola-zero",
    "slug": "coca-cola-zero",
    "categoryId": "drinks",
    "name": "Coca-Cola Zero",
    "nameIt": null,
    "description": "Coca-Cola Zero drink.",
    "price": 4.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Regular",
        "detail": "",
        "price": 4.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 1,
    "imageUrl": "/images/products/coca-cola-zero.jpg",
    "customizations": []
  },
  {
    "id": "fanta",
    "slug": "fanta",
    "categoryId": "drinks",
    "name": "Fanta",
    "nameIt": null,
    "description": "Fanta drink.",
    "price": 4.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Regular",
        "detail": "",
        "price": 4.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 2,
    "imageUrl": "/images/products/fanta.jpg",
    "customizations": []
  },
  {
    "id": "sprite",
    "slug": "sprite",
    "categoryId": "drinks",
    "name": "Sprite",
    "nameIt": null,
    "description": "Sprite drink.",
    "price": 4.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Regular",
        "detail": "",
        "price": 4.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 3,
    "imageUrl": "/images/products/sprite.jpg",
    "customizations": []
  },
  {
    "id": "water",
    "slug": "water",
    "categoryId": "drinks",
    "name": "Water",
    "nameIt": null,
    "description": "Water drink.",
    "price": 1.0,
    "sizes": [
      {
        "id": "regular",
        "label": "Regular",
        "detail": "",
        "price": 1.0
      }
    ],
    "isVeg": true,
    "isSpicy": false,
    "isActive": true,
    "position": 4,
    "imageUrl": "/images/products/water.jpg",
    "customizations": []
  }
];

export function getActiveProducts() {
  return PRODUCTS.filter((product) => product.isActive);
}

export function getProductBySlug(slug: string) {
  return PRODUCTS.find((product) => product.slug === slug && product.isActive);
}

export function getRelatedProducts(product: Product, limit = 3) {
  return PRODUCTS.filter(
    (candidate) =>
      candidate.isActive &&
      candidate.categoryId === product.categoryId &&
      candidate.slug !== product.slug,
  ).slice(0, limit);
}

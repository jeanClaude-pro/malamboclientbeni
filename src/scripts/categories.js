const categories = [
  {
    name: "Electronics",
    description: "Electronic devices and accessories",
  },
  { 
    name: "Clothing", 
    description: "Apparel and fashion items" 
  },
  { 
    name: "Food & Beverages", 
    description: "Food items and drinks" 
  },
  {
    name: "Home & Outdoors",
    description: "Sports equipment and outdoor gear",
  },
  {
    name: "Books & Media",
    description: "Books, movies, and media content",
  },
  {
    name: "Health & Garden",
    description: "Home improvement and garden supplies",
  },
  {
    name: "Sport & Beauty",
    description: "Health and beauty products",
  },
  {
    name: "Automotive",
    description: "Car parts and automotive supplies",
  },
];

const serverUrl = import.meta.env.VITE_API_URL;

async function main() {
  try {
    const response = await fetch(`${serverUrl}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(categories),
    });

    const data = await response.json();
    console.log("Categories:", data);
    console.log("Seeded categories successfully.");
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

main();
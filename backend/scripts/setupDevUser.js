const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Define the development user ID that matches what's used in our frontend
const DEV_USER_ID = '123e4567-e89b-12d3-a456-426614174000';

async function setupDevUser() {
  console.log("🔧 Setting up development user...");
  
  try {
    // Check if the user already exists
    const existingUser = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE id = ${DEV_USER_ID}
    `;
    
    if (existingUser && existingUser.length > 0) {
      console.log("✅ Development user already exists");
      return;
    }
    
    // User doesn't exist, create it
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
      VALUES (${DEV_USER_ID}, 'dev@example.com', 'Development User', ${now}, ${now})
    `;
    
    console.log("✅ Development user created successfully");
  } catch (error) {
    console.error("❌ Failed to create development user:", error.message);
    
    // If the User table doesn't exist yet, create it
    if (error.message.includes('does not exist')) {
      try {
        console.log("⚙️ Creating User table...");
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "name" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "User_pkey" PRIMARY KEY ("id")
          );
        `;
        
        // Try creating the user again
        const now = new Date();
        await prisma.$executeRaw`
          INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
          VALUES (${DEV_USER_ID}, 'dev@example.com', 'Development User', ${now}, ${now})
        `;
        
        console.log("✅ User table created and development user added successfully");
      } catch (createError) {
        console.error("❌ Failed to create User table:", createError.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the setup
setupDevUser()
  .then(() => console.log("🚀 Setup completed"))
  .catch(error => console.error("❌ Setup failed:", error));
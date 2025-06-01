const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Ensure the IncomeGoal table exists in the database
const setupIncomeGoalTable = async () => {
  try {
    // Check if the table exists by trying to query it
    await prisma.$queryRaw`SELECT 1 FROM "IncomeGoal" LIMIT 1`;
    console.log("✅ IncomeGoal table already exists");
    
    // Check if currentAmount column exists
    try {
      await prisma.$queryRaw`SELECT "currentAmount" FROM "IncomeGoal" LIMIT 1`;
      console.log("✅ currentAmount column already exists");
    } catch (columnError) {
      console.log("⚙️ Adding currentAmount column to IncomeGoal table...");
      try {
        await prisma.$executeRaw`ALTER TABLE "IncomeGoal" ADD COLUMN IF NOT EXISTS "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`;
        console.log("✅ currentAmount column added successfully");
      } catch (addColumnError) {
        console.error("❌ Failed to add currentAmount column:", addColumnError.message);
      }
    }
  } catch (error) {
    // If the table doesn't exist, create it
    console.log("⚙️ Setting up IncomeGoal table...");
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "IncomeGoal" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "targetAmount" DOUBLE PRECISION NOT NULL,
          "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "startDate" TIMESTAMP(3) NOT NULL,
          "endDate" TIMESTAMP(3) NOT NULL,
          "user_id" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "IncomeGoal_pkey" PRIMARY KEY ("id")
        );
      `;
      
      // Check if we can create the foreign key constraint
      try {
        await prisma.$executeRaw`
          DO $$
          BEGIN
              IF NOT EXISTS (
                  SELECT 1
                  FROM pg_constraint
                  WHERE conname = 'IncomeGoal_user_id_fkey'
              ) THEN
                  ALTER TABLE "IncomeGoal" 
                  ADD CONSTRAINT "IncomeGoal_user_id_fkey" 
                  FOREIGN KEY ("user_id") REFERENCES "User"("id") 
                  ON DELETE RESTRICT ON UPDATE CASCADE;
              END IF;
          END $$;
        `;
        console.log("✅ IncomeGoal table created successfully with foreign key");
      } catch (fkError) {
        console.log("⚠️ Table created but foreign key could not be added:", fkError.message);
      }
      
      console.log("✅ IncomeGoal table created successfully");
    } catch (createError) {
      console.error("❌ Failed to create IncomeGoal table:", createError.message);
    }
  }
};

// Call setup function
setupIncomeGoalTable().catch(error => {
  console.error("❌ Error in setupIncomeGoalTable:", error.message);
});

// Direct database query functions since Prisma client might not have the model
// Use these functions when prisma.incomeGoal is unavailable

// Helper to generate a UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Direct database query to get all user income goals
const getUserIncomeGoalsRaw = async (userId) => {
  try {
    console.log(`Fetching goals from database for user: ${userId}`);
    
    // Even for mock user, we want to return actual stored goals
    const result = await prisma.$queryRaw`
      SELECT 
        id, name, "targetAmount", "currentAmount", "startDate", "endDate", user_id as "userId", 
        "createdAt", "updatedAt"
      FROM "IncomeGoal"
      WHERE user_id = ${userId}
      ORDER BY "createdAt" DESC
    `;
    
    console.log(`Found ${result.length} goals for user ${userId}`);
    return result;
  } catch (error) {
    console.error("❌ Direct query error:", error.message);
    console.error(error);
    // Return empty array instead of failing to prevent UI errors
    return [];
  }
};

// Direct database query to add an income goal
const addIncomeGoalRaw = async (data) => {
  const { name, targetAmount, currentAmount = 0, startDate, endDate, userId } = data;
  const id = generateUUID();
  const now = new Date();
  
  try {
    // Parse dates properly, handling both ISO string format and date-only format
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    
    console.log(`Adding new goal to database: "${name}" with target $${targetAmount} from ${parsedStartDate.toISOString()} to ${parsedEndDate.toISOString()}`);
    
    // Check if this is the mock user ID used in development
    const isMockUser = userId === '123e4567-e89b-12d3-a456-426614174000';
    
    // For simplicity in development, use raw SQL to directly insert
    console.log("Using direct SQL insert to bypass constraints");
    
    try {
      // First, try to create a user record if it doesn't exist (for development only)
      if (isMockUser) {
        await prisma.$executeRaw`
          INSERT INTO "User" (id, email, name, "createdAt", "updatedAt") 
          VALUES (${userId}, 'mock@example.com', 'Mock User', ${now}, ${now})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // Then insert the goal - using explicit SQL to ensure it's added properly
      await prisma.$executeRaw`
        INSERT INTO "IncomeGoal" (
          id, name, "targetAmount", "currentAmount", "startDate", "endDate", 
          user_id, "createdAt", "updatedAt"
        )
        VALUES (
          ${id}, ${name}, ${parseFloat(targetAmount)}, ${parseFloat(currentAmount)}, 
          ${parsedStartDate}, ${parsedEndDate}, ${userId}, ${now}, ${now}
        )
      `;
      
      console.log("✅ Goal added successfully with ID:", id);
      
      return {
        id,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount),
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        userId,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      console.error("❌ Error during direct insert:", error);
      throw error;
    }
  } catch (error) {
    console.error("❌ Direct insert error:", error.message);
    throw error;
  }
};

// Direct database query to update an income goal
const updateIncomeGoalRaw = async (id, data) => {
  const { name, targetAmount, currentAmount, startDate, endDate } = data;
  const now = new Date();
  
  try {
    await prisma.$executeRaw`
      UPDATE "IncomeGoal" 
      SET 
        name = ${name}, 
        "targetAmount" = ${targetAmount},
        "currentAmount" = ${currentAmount || 0}, 
        "startDate" = ${new Date(startDate)}, 
        "endDate" = ${new Date(endDate)}, 
        "updatedAt" = ${now}
      WHERE id = ${id}
    `;
    
    const result = await prisma.$queryRaw`
      SELECT 
        id, name, "targetAmount", "currentAmount", "startDate", "endDate", user_id as "userId", 
        "createdAt", "updatedAt"
      FROM "IncomeGoal"
      WHERE id = ${id}
    `;
    
    return result[0];
  } catch (error) {
    console.error("❌ Direct update error:", error.message);
    throw error;
  }
};

// Direct database query to delete an income goal
const deleteIncomeGoalRaw = async (id) => {
  try {
    await prisma.$executeRaw`
      DELETE FROM "IncomeGoal"
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error("❌ Direct delete error:", error.message);
    throw error;
  }
};

// Direct database query to get goal progress
const getGoalProgressRaw = async (id) => {
  try {
    // Get the goal details
    const goalResult = await prisma.$queryRaw`
      SELECT 
        id, name, "targetAmount", "currentAmount", "startDate", "endDate", user_id as "userId"
      FROM "IncomeGoal"
      WHERE id = ${id}
    `;
    
    if (!goalResult || goalResult.length === 0) {
      throw new Error('Goal not found');
    }
    
    const goal = goalResult[0];
    
    // We'll use the currentAmount stored in the database instead of calculating from income
    const currentAmount = parseFloat(goal.currentAmount || 0);
    const progressPercentage = Math.min(Math.round((currentAmount / goal.targetAmount) * 100), 100);
    
    return {
      goalId: goal.id,
      name: goal.name,
      targetAmount: parseFloat(goal.targetAmount),
      currentAmount: currentAmount,
      progressPercentage,
      startDate: goal.startDate,
      endDate: goal.endDate
    };
  } catch (error) {
    console.error("❌ Direct progress calculation error:", error.message);
    throw error;
  }
};

// 📌 GET all income goals for a user
const getUserIncomeGoals = async (req, res) => {
  const { userId } = req.params;
  try {
    console.log(`⚙️ Fetching income goals for user: ${userId}`);
    
    // Use direct SQL query by default due to Prisma schema issues
    console.log("Using direct SQL query for fetching goals");
    const goals = await getUserIncomeGoalsRaw(userId);
    
    console.log(`✅ Retrieved ${goals.length} income goals`);
    res.json(goals);
  } catch (error) {
    console.error("❌ Error fetching income goals:", error.message);
    res.status(500).json({ error: "Failed to fetch income goals", details: error.message });
  }
};

// 📌 ADD new income goal
const addIncomeGoal = async (req, res) => {
  try {
    // Log the incoming request body for debugging
    console.log("📥 Received income goal data:", req.body);
    
    const { name, targetAmount, currentAmount = 0, startDate, endDate, userId } = req.body;
    
    // Validate input data
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: "Name is required" });
    }
    
    if (!targetAmount || isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
      return res.status(400).json({ error: "Target amount must be a positive number" });
    }
    
    if (!startDate) {
      return res.status(400).json({ error: "Start date is required" });
    }
    
    if (!endDate) {
      return res.status(400).json({ error: "End date is required" });
    }
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Use direct SQL query by default due to Prisma schema issues
    console.log("Using direct SQL query for adding goal");
    const newGoal = await addIncomeGoalRaw({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount),
      startDate,
      endDate,
      userId
    });
    
    res.status(201).json(newGoal);
  } catch (error) {
    console.error("❌ Error adding income goal:", error.message);
    res.status(500).json({ error: "Failed to add income goal", details: error.message });
  }
};

// 📌 UPDATE income goal
const updateIncomeGoal = async (req, res) => {
  const { id } = req.params;
  const { name, targetAmount, currentAmount = 0, startDate, endDate } = req.body;
  try {
    // Use direct SQL query by default due to Prisma schema issues
    console.log("Using direct SQL query for updating goal");
    const updatedGoal = await updateIncomeGoalRaw(id, {
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount),
      startDate,
      endDate
    });
    
    res.json(updatedGoal);
  } catch (error) {
    console.error("❌ Error updating income goal:", error.message);
    res.status(500).json({ error: "Failed to update income goal", details: error.message });
  }
};

// 📌 DELETE income goal
const deleteIncomeGoal = async (req, res) => {
  const { id } = req.params;
  try {
    // Use direct SQL query by default due to Prisma schema issues
    console.log("Using direct SQL query for deleting goal");
    await deleteIncomeGoalRaw(id);
    
    res.json({ message: "Income goal deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting income goal:", error.message);
    res.status(500).json({ error: "Failed to delete income goal", details: error.message });
  }
};

// 📌 GET progress towards a goal
const getGoalProgress = async (req, res) => {
  const { id } = req.params;
  try {
    // Use direct SQL query by default due to Prisma schema issues
    console.log("Using direct SQL query for calculating goal progress");
    const progressData = await getGoalProgressRaw(id);
    
    res.json(progressData);
  } catch (error) {
    console.error("❌ Error calculating goal progress:", error.message);
    res.status(500).json({ error: "Failed to calculate goal progress", details: error.message });
  }
};

module.exports = {
  getUserIncomeGoals,
  addIncomeGoal,
  updateIncomeGoal,
  deleteIncomeGoal,
  getGoalProgress
};
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Direct database query functions for when Prisma model has issues
const getAllIncomeRaw = async () => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        id, category, amount, date, source
      FROM "Income"
      ORDER BY date DESC
    `;
    return result;
  } catch (error) {
    console.error("❌ Direct query error:", error.message);
    throw error;
  }
};

const addIncomeRaw = async (data) => {
  const { source, amount, category } = data;
  const id = generateUUID();
  const now = new Date();
  
  try {
    await prisma.$executeRaw`
      INSERT INTO "Income" (id, category, amount, date, source)
      VALUES (${id}, ${category}, ${parseFloat(amount)}, ${now}, ${source})
    `;
    
    return {
      id,
      category,
      amount: parseFloat(amount),
      date: now,
      source
    };
  } catch (error) {
    console.error("❌ Direct insert error:", error.message);
    throw error;
  }
};

const updateIncomeRaw = async (id, data) => {
  const { source, amount, category } = data;
  
  try {
    await prisma.$executeRaw`
      UPDATE "Income" 
      SET 
        source = ${source}, 
        amount = ${parseFloat(amount)}, 
        category = ${category}
      WHERE id = ${id}
    `;
    
    const result = await prisma.$queryRaw`
      SELECT 
        id, category, amount, date, source
      FROM "Income"
      WHERE id = ${id}
    `;
    
    return result[0];
  } catch (error) {
    console.error("❌ Direct update error:", error.message);
    throw error;
  }
};

const deleteIncomeRaw = async (id) => {
  try {
    await prisma.$executeRaw`
      DELETE FROM "Income"
      WHERE id = ${id}
    `;
    return { success: true };
  } catch (error) {
    console.error("❌ Direct delete error:", error.message);
    throw error;
  }
};

// Helper to generate a UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// 📌 GET all income records
const getAllIncome = async (req, res) => {
  try {
    console.log("Using direct SQL query for fetching income records");
    const income = await getAllIncomeRaw();
    res.json(income);
  } catch (error) {
    console.error("Error fetching income records:", error);
    res.status(500).json({ error: "Failed to fetch income records" });
  }
};

// 📌 ADD new income record
const addIncome = async (req, res) => {
  const { source, amount, category } = req.body;
  try {
    console.log("Using direct SQL query for adding income record");
    const newIncome = await addIncomeRaw({
      source,
      amount,
      category
    });
    res.status(201).json(newIncome);
  } catch (error) {
    console.error("Error adding income record:", error);
    res.status(500).json({ error: "Failed to add income record" });
  }
};

// 📌 UPDATE income record
const updateIncome = async (req, res) => {
  const { id } = req.params;
  const { source, amount, category } = req.body;
  try {
    console.log("Using direct SQL query for updating income record");
    const updatedIncome = await updateIncomeRaw(id, {
      source,
      amount,
      category
    });
    res.json(updatedIncome);
  } catch (error) {
    console.error("Error updating income record:", error);
    res.status(500).json({ error: "Failed to update income record" });
  }
};

// 📌 DELETE income record
const deleteIncome = async (req, res) => {
  const { id } = req.params;
  try {
    console.log("Using direct SQL query for deleting income record");
    await deleteIncomeRaw(id);
    res.json({ message: "Income record deleted successfully" });
  } catch (error) {
    console.error("Error deleting income record:", error);
    res.status(500).json({ error: "Failed to delete income record" });
  }
};

module.exports = {
  getAllIncome,
  addIncome,
  updateIncome,
  deleteIncome,
};
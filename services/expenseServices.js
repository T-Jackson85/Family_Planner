const { userBalance } = require("../controllers/expenseController.js");
const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();

const createExpense = async(amount, description, userId, eventId) =>  await prisma.expense.create({
    data: { amount, description, user: { connect: { id: userId } }, event: { connect: { id: eventId } } },
});

const addExpense = async(eventId, description, amount) =>  await prisma.expense.create({
    data: {
      description,
      amount,
      eventId: parseInt(eventId),
    },
  });

  const updateExpense = async(id, paid) => await prisma.expense.update({
    where: { id: parseInt(id) },
    data: { paid },
  });

  module.exports = {
    createExpense, addExpense, updateExpense, userBalance
  };

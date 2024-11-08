const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();


// Create new task
const newTask = async(title, userId, eventId) => await prisma.task.create({
    data: { title, user: { connect: { id: userId } }, event: { connect: { id: eventId } } },
});


// Find tasks assigned to a user
const findTask = async(userId) => await prisma.task.findMany({
    where: { userId: parseInt(userId) },
});


// Update tasks to isCompleted
const updateTask = async(id, isCompleted) => await prisma.task.update({
    where: { id: parseInt(id) },
    data: { isCompleted },
});


// Delete tasks
const deleteTask = async(id) =>  await prisma.task.delete({
    where: { id: parseInt(id) },
});

module.exports = { newTask, findTask, updateTask, deleteTask}
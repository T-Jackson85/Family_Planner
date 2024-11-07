const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();

const deleteUser = async(id) => await prisma.user.delete({
    where: { id: parseInt(id) },
});

const createUser = async(firstName, lastName, email, password) => await prisma.user.create({
    data: {
        firstName, lastName, email, password
    },
});

const findUser = async(id) => {
    await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: { tasks: true, groups: true, notifications: true },
    });
}




const updateUser = async (id, name, phone) => {
  return await prisma.user.update({
    where: { id: parseInt(id) },
    data: { name, phone },
  });
};

module.exports = {
  updateUser, deleteUser, createUser, 
};
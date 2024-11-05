const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();

const updateUser = async (id, name, phone) => {
  return await prisma.user.update({
    where: { id: parseInt(id) },
    data: { name, phone },
  });
};

module.exports = {
  updateUser,
};

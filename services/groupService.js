const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();


const createGroup = async(name, adminId) => await prisma.group.create({
    data: { name, admin: { connect: { id: adminId } } },
});  

const findGroup = async(id) => await prisma.group.findUnique({
    where: { id: parseInt(id) },
    include: { users: true, events: true },
});

module.exports = {
    createGroup, findGroup, 
}
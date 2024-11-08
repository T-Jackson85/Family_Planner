const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();

// Create new group.
const createGroup = async(name, adminId) => await prisma.group.create({
    data: { name, admin: { connect: { id: adminId } } },
});  

// Find a specific group.
const findGroup = async(id) => await prisma.group.findUnique({
    where: { id: parseInt(id) },
    include: { users: true, events: true },
});

// delete group.
const deleteGroup = async(id) => await prisma.group.delete({
    where: { id: parseInt(id) },
});

// Update group with adding and removing members.
const updateGroupMembers = async (groupId, addUserIds = [], removeUserIds = []) => {
    return await prisma.group.update({
      where: { id: parseInt(groupId) },
      data: {
        users: {
          connect: addUserIds.map(userId => ({ id: userId })),  // Add new members
          disconnect: removeUserIds.map(userId => ({ id: userId }))  // Remove members
        }
      },
      include: { users: true }  
    });
  };
  

module.exports = {
    createGroup, findGroup, deleteGroup, updateGroupMembers
}
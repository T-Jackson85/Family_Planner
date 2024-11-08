const prisma = require("../prismaClient.js");
const prisma = new PrismaClient();


const createEvent = async(title, date, location, hostId, groupId) => await prisma.event.create({
    data: {
        title, date: new Date(date), location,
        host: { connect: { id: hostId } },
        group: { connect: { id: groupId } },
    },
});
  
const findEvent = async(id) =>  await prisma.event.findUnique({
    where: { id: parseInt(id) },
    include: { comments: true, host: true, group: true },
});

const updateEvent = async(title, description, date, location) => await prisma.event.update({
    where: { id: parseInt(id) },
    data: {
        title,
        description,
        date: new Date(date),
        location,
    },
});

const deleteEvent = async(id) => await prisma.event.delete({
    where: { id: parseInt(id) },
});

module.exports = {
    createEvent, updateEvent, findEvent, deleteEvent
}


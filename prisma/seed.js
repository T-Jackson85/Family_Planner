// prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Seed Users
  const user1 = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      password: 'securepassword123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '123-456-7890',
      location: 'New York',
      birthday: new Date('1990-01-01'),
      avatar: 'https://example.com/avatar/john.jpg',
      wallpaper: 'https://example.com/wallpaper/john.jpg',
      createdAt: new Date(),
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'jane.doe@example.com',
      password: 'anothersecurepassword456',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '987-654-3210',
      location: 'Los Angeles',
      birthday: new Date('1995-05-15'),
      avatar: 'https://example.com/avatar/jane.jpg',
      wallpaper: 'https://example.com/wallpaper/jane.jpg',
      createdAt: new Date(),
    },
  });

  // Seed Groups
  const group1 = await prisma.group.create({
    data: {
      name: 'Family Group',
      createdAt: new Date(),
      users: {
        connect: [{ id: user1.id }, { id: user2.id }],
      },
    },
  });

  // Seed Admins
  await prisma.admin.create({
    data: {
      userId: user1.id,
      groupId: group1.id,
    },
  });

  // Seed Events
  const event1 = await prisma.event.create({
    data: {
      title: 'Family Reunion',
      date: new Date('2024-12-25'),
      location: 'John’s house',
      hostId: user1.id,
      groupId: group1.id,
    },
  });

  // Seed Comments
  await prisma.comment.create({
    data: {
      content: 'Looking forward to the event!',
      userId: user2.id,
      eventId: event1.id,
      createdAt: new Date(),
    },
  });

  // Seed Tasks
  await prisma.task.create({
    data: {
      title: 'Buy Groceries',
      status: 'TODO',
      createdById: user1.id,
      assignedToId: user2.id,
      eventId: event1.id,
    },
  });

  // Seed Expenses
  await prisma.expense.create({
    data: {
      amount: 150.00,
      description: 'Food and Drinks',
      paid: true,
      eventId: event1.id,
      paidById: user1.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

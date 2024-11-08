require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();

app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log('Server running on port 3000');
});

module.exports = app;
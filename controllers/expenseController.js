const { createExpense, addExpense, updateExpense, userBalance } = require("../services/expenseService");

 const createExpense = async(req, res) => {
    const { amount, description, userId, eventId } = req.body;
    const createExpense = createExpense(amount, description, userId, eventId);
    res.json(createExpense);
 };

 const addExpense = async(req, res) => {
    const { eventId } = req.params;
    const { description, amount } = req.body;
    const addExpense = addExpense(eventId, description, amount);
    res.json(addExpense);
 };


 const updateExpense = async(req, res) => {
    const { id } = req.params;
    const updateExpense = updateExpense(id, paid);
    res.json(updateExpense);
 };

 const userBalance = async(req, res) => {
    const { eventId } = req.params;
    const { userId, amount } = req.body;
    const userBalance = userBalance(eventId, userId, amount);
    res.json(userBalance);
 };

 module.exports = {
    createExpense, addExpense, updateExpense, userBalance
 };


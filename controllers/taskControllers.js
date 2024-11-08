const { newTask, findTask, updateTask, deleteTask }= require("../services/taskService");


const newTask = async(req, res) => {
    const {title, userId, eventId } =  req.body;
    const newTask = newTask(title, userId, eventId);
    res.json(newTask);
};

const findTask = async (req, res) => {
    const { userId } = req.params;
    const findTask = findTask(userId);
    res.json(findTask);
};

const updateTask = async (req, res) => {
    const { id } = req.params;
    const { isCompleted } = req.body;
    const updateTask = updateTask(id, isCompleted);
    res.json(updateTask);
};

const deleteTask = async(req, res) => {
    const { id } = req.params;
    const deleteTask = deleteTask(id);
    res.json({ message: "task deleted" });
};

module.exports = {
    newTask, findTask, updateTask, deleteTask
}
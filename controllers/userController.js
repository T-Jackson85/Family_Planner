const { updateUser, deleteUser, createUser, findUser} = require("../services/userService");


const deleteUser = async(req, res) => {
    const { id } = req.params;
    const deleteUser = deleteUser(id);
    res.json({ message: 'User deleted' });

};

const createUser = async(req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const createUser = createUser(firstName, lastName, email, password);
    res.json(createUser);
};

const findUser = async(req, res) => {
    const { id } = req.params;
    const findUser = findUser(id);
    res.json(findUser); 
};


const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;
  const updatedUser = updateUser(id, name, phone);
  res.json(updatedUser);
};

module.exports = {
  updateUser, deleteUser, createUser, findUser
};
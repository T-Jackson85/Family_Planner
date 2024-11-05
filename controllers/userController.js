const { updateUSer } = require("../services/userService");

const updatedUser = async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;
  const updatedUser = updateUSer(id, name, phone);
  res.json(updatedUser);
};

module.exports = {
  updatedUser,
};

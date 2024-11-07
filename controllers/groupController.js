const { createGroup, findGroup, deleteGroup  } = require("../services/groupService");


const createGroup = async(req, res) => {
    const { name, adminId } = req.body;
    const createGroup = createGroup(name, adminId);
    res.json(createGroup);
};

module.exports = {
    createGroup, 
}
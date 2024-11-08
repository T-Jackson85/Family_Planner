const { createGroup, findGroup, deleteGroup, updateGroupMembers  } = require("../services/groupService");


const createGroup = async(req, res) => {
    const { name, adminId } = req.body;
    const createGroup = createGroup(name, adminId);
    res.json(createGroup);
};

const findGroup = async(req, res) => {
    const { id } = req.params;
    const findGroup = findGroup(id);
    res.json(group);
};

const deleteGroup = async(req, res) => {
    const { id } = req.params;
    const deleteGroup = deleteGroup(id);
    res.json({ message: 'Group deleted' });
};

const updateGroupMembers = async(req, res) => {
    
const { id } = req.params;  // Group ID
const { addUserIds = [], removeUserIds = [] } = req.body;
const updatedGroup = await updateGroupMembers(id, addUserIds, removeUserIds);
res.json(updatedGroup);
};

module.exports = {
    createGroup, findGroup, deleteGroup, updateGroupMembers 
}
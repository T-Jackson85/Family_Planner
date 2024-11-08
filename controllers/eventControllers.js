const {createEvent, findEvent, updateEvent, deleteEvent}= require("../services/eventService");

// create event
const createEvent = async(req, res) => {
    const { title, date, location, hostId, groupId } = req.body;
    const createEvent = createEvent(title, date, location, hostId, groupId);
    res.json(createEvent);
};


// find specific event
const findEvent = async(res, req) => {
    const { id } = req.params;
    const findEvent = findEvent(id);
    res.json(findEvent);
};


// update event
const updateEvent = async(res, req) => {
    const { id } = req.params;
    const { title, description, date, location,} = req.body;
    const updateEvent = updatEvent(title, description, date, location);
    res.json(updateEvent);
};


// delete event
const deleteEvent = async(res, req) => {
    const { id } = req.params;
    const deleteEvent = deleteEvent(id);
    res.json({ message : "Event deleted"})
};

module.exports = { createEvent, findEvent, updateEvent, deleteEvent
};

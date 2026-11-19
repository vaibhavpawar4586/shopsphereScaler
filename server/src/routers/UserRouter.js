const express = require('express');
const { getAllUserHandler, getUserById, deleteUserById } = require('../controllers/userController');
const { protectRouteMiddleWare, isAdminMiddleWare } = require('../middlewares/authMiddleware');

const UserRouter = express.Router();

// Every user route needs a logged-in user.
UserRouter.use(protectRouteMiddleWare);

UserRouter.get('/', isAdminMiddleWare, getAllUserHandler);
UserRouter.get('/:userId', getUserById);
UserRouter.delete('/:userId', isAdminMiddleWare, deleteUserById);

module.exports = UserRouter;

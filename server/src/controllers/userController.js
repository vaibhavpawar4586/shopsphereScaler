const UserModel = require('../models/userModel');
const AppError = require('../utils/AppError');
const { getAllFactory, getByIdFactory, deleteByIdFactory } = require('../utils/crudFactory');

/******************** users ********************/
const getAllUserHandler = getAllFactory(UserModel);
const getUserByIdFactory = getByIdFactory(UserModel, 'userId');
const deleteUserByIdFactory = deleteByIdFactory(UserModel, 'userId');

// A user may view their own profile; admins may view anyone's.
const getUserById = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
        return next(new AppError(403, 'You are not authorized to do this action'));
    }
    return getUserByIdFactory(req, res, next);
};

// Admins cannot delete their own account by accident.
const deleteUserById = (req, res, next) => {
    if (req.user.id === req.params.userId) {
        return next(new AppError(400, 'You cannot delete your own account'));
    }
    return deleteUserByIdFactory(req, res, next);
};

module.exports = { getAllUserHandler, getUserById, deleteUserById };

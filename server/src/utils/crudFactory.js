/**
 * Factory functions that build simple CRUD handlers for any Mongoose model,
 * so the same code isn't repeated in every controller (as taught in the course).
 */
const AppError = require('./AppError');
const catchAsync = require('./catchAsync');
const { assertObjectId, toBoundedInt } = require('./validators');

const getAllFactory = (ElementModel) =>
    catchAsync(async (req, res) => {
        const page = toBoundedInt(req.query.page, 1, 1, 10000);
        const limit = toBoundedInt(req.query.limit, 20, 1, 100);
        const [elements, total] = await Promise.all([
            ElementModel.find()
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            ElementModel.countDocuments(),
        ]);
        res.status(200).json({
            status: 'success',
            data: elements,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    });

const getByIdFactory = (ElementModel, paramName = 'elementId') =>
    catchAsync(async (req, res) => {
        const id = req.params[paramName];
        assertObjectId(id);
        const element = await ElementModel.findById(id);
        if (!element) throw new AppError(404, 'Not found');
        res.status(200).json({ status: 'success', data: element });
    });

const deleteByIdFactory = (ElementModel, paramName = 'elementId') =>
    catchAsync(async (req, res) => {
        const id = req.params[paramName];
        assertObjectId(id);
        const element = await ElementModel.findByIdAndDelete(id);
        if (!element) throw new AppError(404, 'Not found');
        res.status(200).json({ status: 'success', message: 'Deleted', data: element });
    });

module.exports = { getAllFactory, getByIdFactory, deleteByIdFactory };

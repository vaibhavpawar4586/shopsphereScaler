const express = require('express');
const {
    getAllProductHandler,
    getAllProductsForAdmin,
    getProductCategories,
    getProductById,
    getProductForAdmin,
    createProductHandler,
    updateProductHandler,
    deleteProductById,
} = require('../controllers/productController');
const { checkInput } = require('../middlewares/middleWares');
const { protectRouteMiddleWare, isAuthorizedMiddleWare } = require('../middlewares/authMiddleware');

const ProductRouter = express.Router();
const canManageProducts = [protectRouteMiddleWare, isAuthorizedMiddleWare(['admin', 'seller'])];

// Fixed paths must come before "/:productId", otherwise Express treats them as an id.
ProductRouter.get('/', getAllProductHandler);
ProductRouter.get('/categories', getProductCategories);
ProductRouter.get('/admin/all', ...canManageProducts, getAllProductsForAdmin);
ProductRouter.get('/admin/:productId', ...canManageProducts, getProductForAdmin);
ProductRouter.get('/:productId', getProductById);

ProductRouter.post('/', checkInput, ...canManageProducts, createProductHandler);
ProductRouter.patch('/:productId', checkInput, ...canManageProducts, updateProductHandler);
ProductRouter.delete('/:productId', ...canManageProducts, deleteProductById);

module.exports = ProductRouter;

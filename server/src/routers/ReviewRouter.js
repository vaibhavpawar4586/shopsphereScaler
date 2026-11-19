const express = require('express');
const { createReviewController, getAllReviewForAProductController } = require('../controllers/reviewController');
const { protectRouteMiddleWare } = require('../middlewares/authMiddleware');

const ReviewRouter = express.Router();

ReviewRouter.get('/:productId', getAllReviewForAProductController);
ReviewRouter.post('/:productId', protectRouteMiddleWare, createReviewController);

module.exports = ReviewRouter;

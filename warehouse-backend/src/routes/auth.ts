import { Router } from 'express';
import { login, customerLogin } from '../controllers/authController';

const router = Router();

// Warehouse Staff Login
router.post('/login', login);

// Customer Login
router.post('/customer/login', customerLogin);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessProfileRouter from "./businessProfile";
import customersRouter from "./customers";
import productsRouter from "./products";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessProfileRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);

export default router;

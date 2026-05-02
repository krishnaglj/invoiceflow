import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessProfileRouter from "./businessProfile";
import customersRouter from "./customers";
import productsRouter from "./products";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";
import estimatesRouter from "./estimates";
import expensesRouter from "./expenses";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessProfileRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);
router.use(estimatesRouter);
router.use(expensesRouter);
router.use(reportsRouter);

export default router;

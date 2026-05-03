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
import vendorsRouter from "./vendors";
import warehousesRouter from "./warehouses";
import purchaseOrdersRouter from "./purchase-orders";
import stockMovementsRouter from "./stock-movements";
import inventoryRouter from "./inventory";
import recurringInvoicesRouter from "./recurring-invoices";
import creditNotesRouter from "./credit-notes";

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
router.use(vendorsRouter);
router.use(warehousesRouter);
router.use(purchaseOrdersRouter);
router.use(stockMovementsRouter);
router.use(inventoryRouter);
router.use(recurringInvoicesRouter);
router.use(creditNotesRouter);

export default router;

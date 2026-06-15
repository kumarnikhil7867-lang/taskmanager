import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import activityRouter from "./activity";
import dashboardRouter from "./dashboard";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);

router.use(requireAuth);

router.use("/tasks", tasksRouter);
router.use("/", activityRouter);
router.use("/dashboard", dashboardRouter);
router.use("/chat", chatRouter);

export default router;

import {
	honoAuthCheckMiddleware,
	honoAuthMiddleware,
} from "@server/middleware/auth";
import agentRoutes from "@server/routes/protected/agents";
import chatRoomRoutes from "@server/routes/protected/chat";
import documentRoutes from "@server/routes/protected/documents";
import organizationUserRoutes from "@server/routes/protected/organization-user";
import workflowRoutes from "@server/routes/protected/workflows";
import type { HonoContext } from "@server/types/hono";
import { Hono } from "hono";

const app = new Hono<HonoContext>()
	.use(honoAuthMiddleware)
	.use(honoAuthCheckMiddleware)
	.route("/chat", chatRoomRoutes)
	.route("/organization", organizationUserRoutes)
	.route("/agents", agentRoutes)
	.route("/workflows", workflowRoutes)
	.route("/documents", documentRoutes);

export default app;

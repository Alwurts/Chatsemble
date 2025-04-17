import {
	honoAuthCheckMiddleware,
	honoAuthMiddleware,
} from "@server/middleware/auth";
import chatRoomRoutes from "@server/routes/protected/chat";
import organizationUserRoutes from "@server/routes/protected/organization-user";
import type { HonoContext } from "@server/types/hono";
import { Hono } from "hono";

const app = new Hono<HonoContext>()
	.use(honoAuthMiddleware)
	.use(honoAuthCheckMiddleware)
	.route("/chat", chatRoomRoutes)
	.route("/organization", organizationUserRoutes);

export default app;

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import rawPlugin from "vite-raw-plugin";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		TanStackRouterVite({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: "src/client/routes",
			generatedRouteTree: "src/client/routeTree.gen.ts",
		}),
		react(),
		cloudflare(),
		tailwindcss(),
		rawPlugin({
			fileRegex: /\.sql$/,
		}),
	],
	resolve: {
		alias: {
			"@client": path.resolve(__dirname, "./src/client"),
			"@shared": path.resolve(__dirname, "./src/shared"),
			"@server": path.resolve(__dirname, "./src/server"),
		},
	},
});

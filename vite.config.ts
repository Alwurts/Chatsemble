import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import rawPlugin from "vite-raw-plugin";

// https://vite.dev/config/
export default defineConfig({
	environments: {
		chatsemble: {
			build: {
				rollupOptions: {
					preserveEntrySignatures: "strict",
				},
			},
		},
	},
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
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/api\./i,
						handler: "NetworkFirst",
						options: {
							cacheName: "api-cache",
							networkTimeoutSeconds: 10,
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
			includeAssets: [
				"favicon-32x32.png",
				"favicon-16x16.png",
				"apple-touch-icon.png",
				"browserconfig.xml",
				"pwa-512x512-maskable.png",
			],
			manifest: {
				name: "Chatsemble",
				short_name: "Chatsemble",
				description: "AI-powered chat application with collaborative features",
				theme_color: "#000000",
				background_color: "#ffffff",
				display: "standalone",
				orientation: "portrait-primary",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "pwa-512x512-maskable.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				categories: ["productivity", "social", "utilities"],
				shortcuts: [
					{
						name: "New Chat",
						short_name: "New Chat",
						description: "Start a new chat conversation",
						url: "/chat",
						icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
					},
				],
			},
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

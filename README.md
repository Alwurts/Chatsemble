# Chatsemble: Your Open-Source Collaborative AI Workspace

[![GitHub stars](https://img.shields.io/github/stars/alwurts/chatsemble?style=social)](https://github.com/Alwurts/Chatsemble)
[![GitHub license](https://img.shields.io/github/license/alwurts/chatsemble?label=license)](https://github.com/Alwurts/Chatsemble/blob/main/LICENSE)
[![Discord](https://img.shields.io/discord/1348769747709329540?label=discord&logo=discord&logoColor=white)](https://discord.gg/46tMZeVjzS)
[![X](https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Fchatsemble&label=Chatsemble
)](https://x.com/chatsemble)
[![X](https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2FAlwurts&label=Alwurts
)](https://x.com/Alwurts)

![hero](/public/chatsemble-app.jpg)

Chatsemble is an **open-source**, real-time platform designed to revolutionize how teams work together with AI. It brings humans and intelligent AI agents into the same collaborative space, enabling seamless communication, task automation, and shared workflows – all powered by the robust and scalable Cloudflare ecosystem.

Think of it like your team's chat app, but supercharged with customizable AI assistants that participate just like human members, helping you research, automate tasks, and get more done, together.

> **This project is actively under development.** We're building in the open, and contributions are welcome!

## ✨ Why Chatsemble?

* **Seamless Human-AI Collaboration:** Chat directly with AI agents alongside your team members in shared chat rooms. Agents understand context and participate intelligently.
* **Real-time Multiplayer Experience:** Built with WebSockets, Chatsemble provides instant message delivery and updates, making collaboration feel fluid and immediate.
* **Powerful AI Capabilities:** Equip agents with tools for web research, task automation, and more. Create custom workflows to automate routine processes.
* **Open Source & Customizable:** As an open-source project under the GPL-3.0 license, Chatsemble encourages transparency, community contributions, and allows self-hosting.
* **Built on Cloudflare:** Leverages Cloudflare Workers, Durable Objects, and D1 for a scalable, performant, and cost-effective serverless architecture.

## 🚀 Features

* **Real-time Chat:**
  * **Multi-user Channels:** Create chat rooms for teams or projects.
  * **Threaded Conversations:** Keep discussions organized by replying in threads.
  * **Mentions:** Easily tag users and agents using `@mentions` to direct messages or tasks.
* **Intelligent AI Agents:**
  * **Agents as Members:** Add AI agents to any chat room just like human members.
  * **Customizable Personalities:** Define how agents behave – their tone (formal, casual), verbosity (concise, detailed), emoji usage, and language style.
  * **Context-Aware Participation:** Agents can understand the conversation and respond only when relevant or explicitly mentioned.
* **AI Tool Usage:**
  * **Web Research:** Agents can perform web searches and deep research tasks directly within the chat.
  * **Real-time Tool Feedback:** See updates as agents work on tasks like web crawls or research.
* **Automated Workflows:**
  * **Scheduled Tasks:** Define multi-step workflows for agents to execute automatically based on a schedule (e.g., daily reports, weekly summaries).
  * **Goal-Oriented:** Specify the overall goal and individual steps for each workflow.
  * **Dedicated Threads:** Workflows automatically create threads to post their progress and results, keeping main channels clean.
* **Open Source & Self-Hostable:**
  * **Transparency:** Understand exactly how Chatsemble works by exploring the code.
  * **Control Your Data:** Host Chatsemble on your own Cloudflare account.
  * **Extensibility:** Modify and extend the platform.

## 🏗️ Architecture Overview (Simplified)

Chatsemble leverages the power of the Cloudflare stack:

* **Frontend:** A React application provides the user interface.
* **Backend API:** Built with Hono, running on Cloudflare Workers, handling requests and business logic.
* **Database:** Cloudflare D1 stores primary application data (users, organizations).
* **Real-time & State:** Cloudflare Durable Objects are the core of the real-time system. **A single Durable Object per organization** manages WebSocket connections for all users in that org, handles message broadcasting, AI agent interactions, workflow scheduling, and maintains chat room state using an embedded SQLite database (managed via Drizzle ORM). This ensures data locality and efficient real-time communication within an organization.

## 💻 Technologies

* **Frontend:**
  * Vite with React
  * React & TypeScript
  * Tailwind CSS & Shadcn UI
  * TanStack Router & Query
* **Backend:**
  * Hono.js with RPC functionality (on Cloudflare Workers)
  * Cloudflare Durable Objects
* **Database:**
  * Cloudflare D1 (Main relational data)
  * SQLite (within Durable Objects for real-time state)
  * Drizzle ORM (for both D1 and DO SQLite)
* **Real-time:**
  * WebSockets (managed by Durable Objects)
* **AI Integration:**
  * AI SDK (Vercel AI SDK)
  * Cloudflare AI Gateway
  * LLM Providers (e.g., OpenAI, Google Gemini)
  * External Tools (e.g., Firecrawl, Brave Search)
* **Authentication:**
  * Better Auth

## 📁 Project Structure

Chatsemble is a monorepo managed with pnpm workspaces, organized into key packages:

* **`client` (Frontend):** The React application handling the UI and user interaction.
  * Uses TanStack Router for routing and TanStack Query for data fetching.
  * Communicates with the `server` API.
  * Handles WebSocket connections with the `OrganizationDurableObject`.
* **`server` (Backend):** The Hono API running on Cloudflare Workers.
  * Defines API routes (`/api`).
  * Includes the `OrganizationDurableObject` implementation which manages real-time logic, AI interactions, and state persistence within its embedded SQLite DB.
  * Handles authentication via Better Auth.
  * Interacts with Cloudflare D1 for global data.
* **`shared` (Shared Code):** Contains types, schemas (Zod), and utility functions used by both frontend and backend.

## 🚀 Getting Started

*(Instructions on setting up the development environment, configuring Cloudflare services, and running the application will be added here soon.)*

## 🤝 Contributing

We welcome contributions! Check out the open issues on GitHub to find areas where you can help.

## 📄 License

Chatsemble is released under the [GNU General Public License v3.0](LICENSE).

TODO: Centralize query hooks and query keys

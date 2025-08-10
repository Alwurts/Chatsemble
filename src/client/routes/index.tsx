// src/client/routes/index.tsx

import { ThemeToggle } from "@client/components/common/theme-toggle";
import { LogoIcon } from "@client/components/icons/logo-icon";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { FileCode, GithubIcon, Mail, Server, Settings } from "lucide-react";

export const Route = createFileRoute("/")({
	component: ChatsembleLandingPage,
});

function ChatsembleLandingPage() {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
					<div className="flex flex-shrink-0 items-center gap-2 md:gap-6">
						<a href="/" className="flex items-center gap-2">
							<LogoIcon className="h-6 w-6" />
							<span className="text-lg md:text-xl font-bold whitespace-nowrap">
								Chatsemble
							</span>
						</a>
						<nav className="hidden md:flex gap-6">
							<a
								href="#features"
								className="text-sm font-medium text-muted-foreground hover:text-foreground"
							>
								Features
							</a>
							<a
								href="#open-source"
								className="text-sm font-medium text-muted-foreground hover:text-foreground"
							>
								Open Source
							</a>
							<a
								href="#use-cases"
								className="text-sm font-medium text-muted-foreground hover:text-foreground"
							>
								Use Cases
							</a>
						</nav>
					</div>
					<div className="flex items-center gap-2 sm:gap-4">
						<ThemeToggle variant="icon" />
						<Button
							variant="outline"
							size="sm"
							asChild
							className="hidden sm:inline-flex"
						>
							<a
								href="https://github.com/chatsemble/chatsemble"
								target="_blank"
								rel="noopener noreferrer"
							>
								<GithubIcon className="mr-2 h-4 w-4" />
								GitHub
							</a>
						</Button>
						<Button variant="ghost" size="icon" asChild className="sm:hidden">
							<a
								href="https://github.com/chatsemble/chatsemble"
								target="_blank"
								rel="noopener noreferrer"
							>
								<GithubIcon className="h-4 w-4" />
								<span className="sr-only">GitHub</span>
							</a>
						</Button>
						<Button size="sm" asChild>
							<a href="#notify">Get Notified</a>
						</Button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				<section className="container mx-auto py-24 md:py-32 px-4 md:px-6 text-center">
					<div className="max-w-4xl mx-auto">
						<Badge variant="outline" className="mb-4">
							Under Active Development
						</Badge>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
							The collaborative AI workspace
						</h1>
						<p className="text-xl text-muted-foreground mb-8">
							Chat, collaborate, and build with a team of humans and AI agents
							working together in real-time. Launching soon!
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button size="lg" asChild>
								<a href="#notify">Get Notified for Launch</a>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<a href="#features">Learn more</a>
							</Button>
						</div>
					</div>
				</section>

				<section id="features" className="py-24 bg-muted/50">
					<div className="container mx-auto px-4 md:px-6">
						<div className="text-center mb-16">
							<h2 className="text-3xl md:text-4xl font-bold mb-4">
								Human-AI collaboration, reimagined
							</h2>
							<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
								Chatsemble brings AI agents directly into your team's workflow,
								creating a seamless environment for collaboration.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center mb-24">
							<div>
								<h3 className="text-2xl font-bold mb-4">
									Multiplayer chat with AI agents
								</h3>
								<p className="text-lg text-muted-foreground mb-6">
									Create group chats and direct messages where both humans and
									AI agents can participate as first-class members.
								</p>
								<ul className="space-y-2 text-muted-foreground">
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>Public and private group chats</span>
									</li>
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>One-to-one direct messages with users & agents</span>
									</li>
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>Threaded conversations for focused discussions</span>
									</li>
								</ul>
							</div>
							<div className="relative h-[350px] rounded-lg overflow-hidden border bg-background shadow-lg">
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Feature Illustration
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center mb-24">
							<div className="order-2 md:order-1 relative h-[350px] rounded-lg overflow-hidden border bg-background shadow-lg">
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Feature Illustration
								</div>
							</div>
							<div className="order-1 md:order-2">
								<h3 className="text-2xl font-bold mb-4">
									Customizable AI agents
								</h3>
								<p className="text-lg text-muted-foreground mb-6">
									Create and configure AI agents with unique personalities and
									capabilities to assist with specific tasks.
								</p>
								<ul className="space-y-2 text-muted-foreground">
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>
											Define agent personalities (tone, style, verbosity)
										</span>
									</li>
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>
											Equip agents with tools for web search & deep research
										</span>
									</li>
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>
											Intelligent routing directs messages to the right agent
										</span>
									</li>
								</ul>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
							<div>
								<h3 className="text-2xl font-bold mb-4">
									Powerful AI tools & workflows
								</h3>
								<p className="text-lg text-muted-foreground mb-6">
									Leverage AI agents equipped with tools to perform actions and
									automate workflows within your team.
								</p>
								<ul className="space-y-2 text-muted-foreground">
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>Web search and deep research capabilities</span>
									</li>
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>(Coming Soon) Schedule tasks for agents</span>
									</li>
									<li className="flex items-start">
										<div className="mr-2 mt-1 h-5 w-5 flex-shrink-0 flex items-center justify-center rounded-full bg-primary/10">
											<div className="h-2 w-2 rounded-full bg-primary" />
										</div>
										<span>Real-time feedback on tool usage progress</span>
									</li>
								</ul>
							</div>
							<div className="relative h-[350px] rounded-lg overflow-hidden border bg-background shadow-lg">
								<div className="flex items-center justify-center h-full text-muted-foreground">
									Feature Illustration
								</div>
							</div>
						</div>
					</div>
				</section>

				<section id="open-source" className="py-24">
					<div className="container mx-auto px-4 md:px-6">
						<div className="text-center mb-16">
							<h2 className="text-3xl md:text-4xl font-bold mb-4">
								Open source. Transparent. Customizable.
							</h2>
							<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
								Chatsemble is fully open-source, allowing for transparency,
								community contributions, and self-hosting.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							<div className="bg-background p-6 md:p-8 rounded-lg border">
								<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
									<FileCode className="text-primary h-6 w-6" />
								</div>
								<h3 className="text-xl font-bold mb-2">Transparent codebase</h3>
								<p className="text-muted-foreground text-sm">
									Review the code, understand how it works, and contribute to
									its development. No black boxes.
								</p>
							</div>

							<div className="bg-background p-6 md:p-8 rounded-lg border">
								<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
									<Server className="text-primary h-6 w-6" />
								</div>
								<h3 className="text-xl font-bold mb-2">Self-hostable</h3>
								<p className="text-muted-foreground text-sm">
									Host Chatsemble on your own infrastructure for complete
									control over your data and privacy.
								</p>
							</div>

							<div className="bg-background p-6 md:p-8 rounded-lg border">
								<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
									<Settings className="text-primary h-6 w-6" />
								</div>
								<h3 className="text-xl font-bold mb-2">Customizable</h3>
								<p className="text-muted-foreground text-sm">
									Extend and modify Chatsemble to fit your specific needs and
									integrate with your existing tools.
								</p>
							</div>
						</div>

						<div className="mt-16 text-center">
							<Button size="lg" asChild>
								<a
									href="https://github.com/chatsemble/chatsemble"
									target="_blank"
									rel="noopener noreferrer"
								>
									<GithubIcon className="mr-2 h-5 w-5" />
									View Code on GitHub
								</a>
							</Button>
						</div>
					</div>
				</section>

				<section id="use-cases" className="py-24 bg-muted/50">
					<div className="container mx-auto px-4 md:px-6">
						<div className="text-center mb-16">
							<h2 className="text-3xl md:text-4xl font-bold mb-4">
								Your workflow. Your way.
							</h2>
							<p className="text-xl text-muted-foreground max-w-3xl mx-auto">
								Chatsemble adapts to your team's unique needs, enhancing
								productivity across various departments and use cases.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							<div className="bg-background p-6 md:p-8 rounded-lg border">
								<h3 className="text-xl font-bold mb-4">Marketing Teams</h3>
								<p className="text-muted-foreground mb-6 text-sm">
									Collaborate with AI agents to draft content, analyze
									campaigns, and research market trends in real-time.
								</p>
								<div className="relative h-[200px] rounded-md overflow-hidden bg-muted border">
									<div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
										Use Case Example
									</div>
								</div>
							</div>

							<div className="bg-background p-6 md:p-8 rounded-lg border">
								<h3 className="text-xl font-bold mb-4">
									Research & Development
								</h3>
								<p className="text-muted-foreground mb-6 text-sm">
									Leverage AI agents to gather information, summarize papers,
									analyze data, and assist with complex problem-solving.
								</p>
								<div className="relative h-[200px] rounded-md overflow-hidden bg-muted border">
									<div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
										Use Case Example
									</div>
								</div>
							</div>

							<div className="bg-background p-6 md:p-8 rounded-lg border">
								<h3 className="text-xl font-bold mb-4">Customer Support</h3>
								<p className="text-muted-foreground mb-6 text-sm">
									Enhance support workflows with AI agents retrieving knowledge
									base articles and assisting human agents in real-time.
								</p>
								<div className="relative h-[200px] rounded-md overflow-hidden bg-muted border">
									<div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
										Use Case Example
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section id="notify" className="py-24">
					<div className="container mx-auto px-4 md:px-6">
						<div className="max-w-2xl mx-auto text-center bg-muted p-8 md:p-12 rounded-lg border">
							<Mail className="h-12 w-12 mx-auto mb-6 text-primary" />
							<h2 className="text-3xl font-bold mb-4">Launching Soon!</h2>
							<p className="text-lg text-muted-foreground mb-8">
								Chatsemble is under active development. Sign up below to get
								notified when we launch and be among the first to try it out.
							</p>
							<form
								className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
								onSubmit={(e) => e.preventDefault()}
							>
								<Input
									type="email"
									placeholder="Enter your email"
									required
									className="flex-1"
									aria-label="Email for notifications"
								/>
								<Button type="submit" className="sm:w-auto">
									Notify Me
								</Button>
							</form>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t py-8 bg-background">
				<div className="container mx-auto flex flex-col md:flex-row justify-between items-center px-4 md:px-6">
					<div className="flex items-center gap-2 mb-4 md:mb-0">
						<LogoIcon className="h-6 w-6" />
						<span className="font-medium text-sm text-foreground">
							Chatsemble
						</span>
					</div>
					<p className="text-xs text-muted-foreground mb-4 md:mb-0 md:order-3">
						© {new Date().getFullYear()} Chatsemble. MIT Licensed.
					</p>
					<div className="flex gap-6 md:gap-8 md:order-2">
						<a
							href="https://github.com/chatsemble/chatsemble"
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							GitHub
						</a>
						<a
							href="/#"
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Documentation
						</a>
						<a
							href="/#"
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Community
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}

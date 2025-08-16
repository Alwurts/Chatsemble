import { sql } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite/driver";
import type { MigrationMeta } from "drizzle-orm/migrator";

interface MigrationConfig {
	journal: {
		entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
	};
	migrations: Record<string, string>;
}

function readMigrationFiles({
	journal,
	migrations,
}: MigrationConfig): MigrationMeta[] {
	const migrationQueries: MigrationMeta[] = [];

	for (const journalEntry of journal.entries) {
		const query =
			migrations[`m${journalEntry.idx.toString().padStart(4, "0")}`];

		if (!query) {
			throw new Error(`Missing migration: ${journalEntry.tag}`);
		}

		try {
			const result = query.split("--> statement-breakpoint").map((it) => {
				return it;
			});

			migrationQueries.push({
				sql: result,
				bps: journalEntry.breakpoints,
				folderMillis: journalEntry.when,
				hash: "",
			});
		} catch {
			throw new Error(`Failed to parse migration: ${journalEntry.tag}`);
		}
	}

	return migrationQueries;
}

export async function migrate<TSchema extends Record<string, unknown>>(
	db: DrizzleSqliteDODatabase<TSchema>,
	config: MigrationConfig,
): Promise<void> {
	const migrations = readMigrationFiles(config);

	db.transaction((tx) => {
		try {
			const migrationsTable = "__drizzle_migrations";

			const migrationTableCreate = sql`
				CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsTable)} (
					id SERIAL PRIMARY KEY,
					hash text NOT NULL,
					created_at numeric
				)
			`;

			db.run(migrationTableCreate);

			console.log("[migrate custom] migrations", migrations);

			const dbMigrations = db.values<[number, string, string]>(
				sql`SELECT id, hash, created_at FROM ${sql.identifier(migrationsTable)} ORDER BY created_at DESC LIMIT 1`,
			);

			console.log("[migrate custom] dbMigrations", dbMigrations);
			const lastDbMigration = dbMigrations[0] ?? undefined;

			for (const migration of migrations) {
				console.log("[migrate custom] migration", migration);
				if (
					!lastDbMigration ||
					Number(lastDbMigration[2])! < migration.folderMillis
				) {
					for (const stmt of migration.sql) {
						console.log("[migrate custom] stmt", stmt);
						db.run(sql.raw(stmt));
					}

					console.log("[migrate custom] migration.hash", migration.hash);
					console.log(
						"[migrate custom] migration.folderMillis",
						migration.folderMillis,
					);

					db.run(
						sql`INSERT INTO ${sql.identifier(
							migrationsTable,
						)} ("hash", "created_at") VALUES(${migration.hash}, ${migration.folderMillis})`,
					);
					console.log("[migrate custom] lastDbMigration");
				}
			}
		} catch (error: any) {
			console.log("[migrate custom] error", error);
			tx.rollback();
			throw error;
		}
	});
}

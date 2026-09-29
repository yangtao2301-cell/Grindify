// 仅用于初始化新数据库；已有数据的数据库会被拒绝执行。
const { AppDataSource } = require('/app/dist/dataSource');

async function main() {
  await AppDataSource.initialize();

  try {
    const applicationTables = await AppDataSource.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> 'migrations'
    `);
    if (applicationTables.length > 0) {
      throw new Error('Database is not empty; refusing to synchronize it.');
    }

    const migrationTable = await AppDataSource.query(
      "SELECT to_regclass('public.migrations') AS name",
    );
    if (migrationTable[0].name) {
      const result = await AppDataSource.query('SELECT COUNT(*) AS count FROM migrations');
      if (Number(result[0].count) > 0) {
        throw new Error('Migration history is not empty; refusing to bootstrap.');
      }
    }

    await AppDataSource.synchronize();
    await AppDataSource.runMigrations({ fake: true });
    const result = await AppDataSource.query('SELECT COUNT(*) AS count FROM migrations');
    console.log(`Created current schema and marked ${result[0].count} legacy migrations applied.`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

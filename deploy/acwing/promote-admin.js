// Run inside the production backend container. The target must already be registered.
const { AppDataSource } = require('/app/dist/dataSource');

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const checkOnly = process.env.ADMIN_CHECK_ONLY === 'true';
  if (!email || !email.includes('@')) {
    throw new Error('ADMIN_EMAIL must be an email address.');
  }

  await AppDataSource.initialize();
  try {
    const users = await AppDataSource.query(
      'SELECT id, email, role, "emailVerified" FROM "user" WHERE lower(email) = $1',
      [email],
    );
    if (users.length !== 1) {
      throw new Error(`Expected one registered account for ${email}; found ${users.length}.`);
    }

    const user = users[0];
    if (checkOnly) {
      console.log(JSON.stringify(user));
      return;
    }

    await AppDataSource.query(
      'UPDATE "user" SET role = $1 WHERE id = $2 AND lower(email) = $3',
      ['superadmin', user.id, email],
    );
    const verified = await AppDataSource.query(
      'SELECT role FROM "user" WHERE id = $1 AND lower(email) = $2',
      [user.id, email],
    );
    if (verified.length !== 1 || verified[0].role !== 'superadmin') {
      throw new Error(`Role update could not be verified for ${email}.`);
    }
    console.log(`Granted superadmin role to ${user.email} (id ${user.id}).`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

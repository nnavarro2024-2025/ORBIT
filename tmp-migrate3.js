/**
 * DB Migration: Remove course/yearLevel/department/courseYearDept columns,
 * add campus column to facilities, add new user roles to the enum.
 */
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('Starting migration...');

    // 1. Drop course-related columns from facility_bookings
    console.log('Dropping course columns from facility_bookings...');
    await client.query(`
      ALTER TABLE facility_bookings
        DROP COLUMN IF EXISTS course_year_dept,
        DROP COLUMN IF EXISTS course,
        DROP COLUMN IF EXISTS year_level,
        DROP COLUMN IF EXISTS department;
    `);
    console.log('  ✓ course columns dropped');

    // 2. Add campus column to facilities
    console.log('Adding campus column to facilities...');
    // First create the enum type if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campus') THEN
          CREATE TYPE campus AS ENUM ('selga', 'bonifacio');
        END IF;
      END$$;
    `);
    await client.query(`
      ALTER TABLE facilities
        ADD COLUMN IF NOT EXISTS campus campus;
    `);
    console.log('  ✓ campus column added to facilities');

    // 3. Add new values to user_role enum
    console.log('Adding new roles to user_role enum...');
    // PostgreSQL requires separate statements for each new enum value
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'authorize_selga'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) THEN
          ALTER TYPE user_role ADD VALUE 'authorize_selga';
        END IF;
      END$$;
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'authorize_bonifacio'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) THEN
          ALTER TYPE user_role ADD VALUE 'authorize_bonifacio';
        END IF;
      END$$;
    `);
    console.log('  ✓ authorize_selga and authorize_bonifacio roles added');

    // Verify
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'facility_bookings'
      AND column_name IN ('course_year_dept', 'course', 'year_level', 'department');
    `);
    console.log('\nRemaining course columns in facility_bookings:', cols.rows.length === 0 ? 'none (all removed)' : cols.rows.map(r => r.column_name));

    const campusCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'facilities' AND column_name = 'campus';
    `);
    console.log('campus column in facilities:', campusCols.rows.length > 0 ? 'present' : 'missing');

    const roles = await client.query(`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumsortorder;
    `);
    console.log('user_role enum values:', roles.rows.map(r => r.enumlabel));

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

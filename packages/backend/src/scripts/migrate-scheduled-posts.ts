import sequelize from '../config/database';

/**
 * Migration: Add retry tracking fields to scheduled_posts table
 * 
 * This script adds the following columns:
 * - retryCount: INTEGER (default 0) - Tracks number of retry attempts
 * - lastRetryAt: TIMESTAMP - Timestamp of last retry attempt
 */

export async function up() {
  try {
    await sequelize.getQueryInterface().addColumn('scheduled_posts', 'retryCount', {
      type: sequelize.Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true,
    });
    console.log('✅ Added column: scheduled_posts.retryCount');

    await sequelize.getQueryInterface().addColumn('scheduled_posts', 'lastRetryAt', {
      type: sequelize.Sequelize.DATE,
      allowNull: true,
    });
    console.log('✅ Added column: scheduled_posts.lastRetryAt');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down() {
  try {
    await sequelize.getQueryInterface().removeColumn('scheduled_posts', 'retryCount');
    console.log('✅ Removed column: scheduled_posts.retryCount');

    await sequelize.getQueryInterface().removeColumn('scheduled_posts', 'lastRetryAt');
    console.log('✅ Removed column: scheduled_posts.lastRetryAt');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

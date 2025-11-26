// Script to fix existing Academic nodes with userId instead of id
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your-password'
  )
);

async function fixUserIds() {
  const session = driver.session();
  
  try {
    console.log('Checking for Academic nodes with userId field...');
    
    // Find all Academic nodes that have userId but not id
    const result = await session.run(
      `MATCH (a:Academic)
       WHERE exists(a.userId) AND NOT exists(a.id)
       SET a.id = a.userId
       REMOVE a.userId
       RETURN count(a) as updated`
    );
    
    const updated = result.records[0].get('updated').toNumber();
    console.log(`✓ Updated ${updated} Academic node(s)`);
    
    // Verify the fix
    const verifyResult = await session.run(
      `MATCH (a:Academic)
       RETURN count(a) as total,
              sum(CASE WHEN exists(a.id) THEN 1 ELSE 0 END) as withId,
              sum(CASE WHEN exists(a.userId) THEN 1 ELSE 0 END) as withUserId`
    );
    
    const stats = verifyResult.records[0];
    console.log('\nDatabase status:');
    console.log(`- Total Academic nodes: ${stats.get('total').toNumber()}`);
    console.log(`- Nodes with 'id' field: ${stats.get('withId').toNumber()}`);
    console.log(`- Nodes with 'userId' field: ${stats.get('withUserId').toNumber()}`);
    
  } catch (error) {
    console.error('Error fixing user IDs:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

fixUserIds();

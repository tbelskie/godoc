const HugoContextManager = require('./src/context-manager');

async function test() {
  const manager = new HugoContextManager();
  await manager.init();
  
  console.log('Default context:', await manager.loadContext());
  
  // Modify and save
  const context = await manager.loadContext();
  context.claudeInteractions++;
  await manager.saveContext(context);
  
  console.log('Updated context:', await manager.loadContext());
}

test();
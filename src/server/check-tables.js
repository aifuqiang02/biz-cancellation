import { prisma } from './dist/lib/prisma.js';

async function checkTables() {

  try {
    console.log('🔍 检查数据库表结构...\n');

    // 检查用户表
    console.log('📋 检查 users 表...');
    const usersCount = await prisma.user.count();
    console.log(`✅ users 表存在，记录数: ${usersCount}`);

    // 检查注销业务表
    console.log('\n📋 检查 deregistration_businesses 表...');
    const businessesCount = await prisma.deregistrationBusiness.count();
    console.log(`✅ deregistration_businesses 表存在，记录数: ${businessesCount}`);

    // 检查注销业务日志表
    console.log('\n📋 检查 deregistration_logs 表...');
    const logsCount = await prisma.deregistrationLog.count();
    console.log(`✅ deregistration_logs 表存在，记录数: ${logsCount}`);

    // 检查端口分配表
    console.log('\n📋 检查 port_allocations 表...');
    const portsCount = await prisma.portAllocation.count();
    console.log(`✅ port_allocations 表存在，记录数: ${portsCount}`);

    console.log('\n🎉 所有表结构验证完成！');

    // 显示表结构信息
    console.log('\n📊 表结构概览:');
    console.log('- users: 用户信息表');
    console.log('- deregistration_businesses: 注销业务表');
    console.log('- deregistration_logs: 注销业务日志表');
    console.log('- port_allocations: 端口分配表');

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Criar cidades iniciais
  const cityA = await prisma.city.upsert({
    where: { slug: 'cidade-alpha' },
    update: {},
    create: {
      name: 'Cidade Alpha',
      slug: 'cidade-alpha',
      backgroundMode: 'STATIC'
    }
  });

  const cityB = await prisma.city.upsert({
    where: { slug: 'cidade-beta' },
    update: {},
    create: {
      name: 'Cidade Beta',
      slug: 'cidade-beta',
      backgroundMode: 'STATIC'
    }
  });

  console.log('✅ Cidades criadas:', cityA.name, cityB.name);

  // Criar Super Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { discordId: 'superadmin#0001' },
    update: {},
    create: {
      name: 'Super Admin',
      discordId: 'superadmin#0001',
      email: 'admin@eufogrup.com',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      firstLogin: false,
      cityAccesses: {
        create: [{ cityId: cityA.id }, { cityId: cityB.id }]
      }
    }
  });

  console.log('✅ Super Admin criado - Discord: superadmin#0001 / Senha: admin123');

  // Criar operador para cidade A
  const operatorPassword = await bcrypt.hash('op123456', 12);
  await prisma.user.upsert({
    where: { discordId: 'operador_alpha#1234' },
    update: {},
    create: {
      name: 'Operador Alpha',
      discordId: 'operador_alpha#1234',
      password: operatorPassword,
      role: 'OPERATOR',
      firstLogin: true,
      cityAccesses: {
        create: [{ cityId: cityA.id }]
      }
    }
  });

  console.log('✅ Operador Alpha criado - Discord: operador_alpha#1234 / Senha: op123456');

  // Criar funcionários para Cidade A
  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { discordId_cityId: { discordId: 'joao#1111', cityId: cityA.id } },
      update: {},
      create: { name: 'João Silva', discordId: 'joao#1111', cargo: 'Policial', funcao: 'Patrulhamento', cityId: cityA.id }
    }),
    prisma.employee.upsert({
      where: { discordId_cityId: { discordId: 'maria#2222', cityId: cityA.id } },
      update: {},
      create: { name: 'Maria Santos', discordId: 'maria#2222', cargo: 'Investigadora', funcao: 'Investigação', cityId: cityA.id }
    })
  ]);

  console.log('✅ Funcionários criados para Cidade Alpha');

  // Criar tasks de exemplo
  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'Revisar relatório de patrulha',
        description: 'Revisar o relatório de patrulha do turno da manhã',
        status: 'PENDING',
        priority: 'HIGH',
        employeeId: employees[0].id,
        cityId: cityA.id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        title: 'Investigar ocorrência #4521',
        description: 'Investigar ocorrência relatada na área central',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        employeeId: employees[1].id,
        cityId: cityA.id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    ]
  });

  console.log('✅ Tasks de exemplo criadas');
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais:');
  console.log('   Super Admin: superadmin#0001 / admin123');
  console.log('   Operador Alpha: operador_alpha#1234 / op123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

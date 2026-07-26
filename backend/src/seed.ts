import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Verificar se já existe um super admin — se sim, pula o seed
  const existing = await prisma.user.findUnique({
    where: { discordId: 'superadmin#0001' }
  });

  if (existing) {
    console.log('✅ Seed já aplicado anteriormente. Pulando...');
    return;
  }

  console.log('🌱 Aplicando seed inicial...');

  // Criar cidades iniciais
  const cityA = await prisma.city.create({
    data: {
      name: 'Cidade Alpha',
      slug: 'cidade-alpha',
      backgroundMode: 'STATIC'
    }
  });

  const cityB = await prisma.city.create({
    data: {
      name: 'Cidade Beta',
      slug: 'cidade-beta',
      backgroundMode: 'STATIC'
    }
  });

  console.log('✅ Cidades criadas:', cityA.name, '|', cityB.name);

  // Criar Super Admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.create({
    data: {
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

  // Criar operador para cidade A
  const operatorPassword = await bcrypt.hash('op123456', 12);
  await prisma.user.create({
    data: {
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

  // Criar funcionários de exemplo
  const emp1 = await prisma.employee.create({
    data: {
      name: 'João Silva',
      discordId: 'joao#1111',
      cargo: 'Policial',
      funcao: 'Patrulhamento',
      cityId: cityA.id
    }
  });

  const emp2 = await prisma.employee.create({
    data: {
      name: 'Maria Santos',
      discordId: 'maria#2222',
      cargo: 'Investigadora',
      funcao: 'Investigação',
      cityId: cityA.id
    }
  });

  // Criar tasks de exemplo
  await prisma.task.createMany({
    data: [
      {
        title: 'Revisar relatório de patrulha',
        description: 'Revisar o relatório de patrulha do turno da manhã',
        status: 'PENDING',
        priority: 'HIGH',
        employeeId: emp1.id,
        cityId: cityA.id,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        title: 'Investigar ocorrência #4521',
        description: 'Investigar ocorrência relatada na área central',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        employeeId: emp2.id,
        cityId: cityA.id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      }
    ]
  });

  console.log('✅ Seed inicial aplicado com sucesso!');
  console.log('   Super Admin: superadmin#0001 / admin123');
  console.log('   Operador Alpha: operador_alpha#1234 / op123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    // Não falhar o processo por causa do seed
  })
  .finally(() => prisma.$disconnect());

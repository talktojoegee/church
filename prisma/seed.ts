import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ALL_PERMISSIONS,
  moduleOf,
  permissionLabel,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from '@chms/shared';

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function daysFromNow(offset: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function sundayAgo(weeks: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  // Snap to most recent Sunday before that point
  d.setDate(d.getDate() - d.getDay());
  d.setHours(9, 0, 0, 0);
  return d;
}

async function seedSiteContent(churchId: string, churchName: string) {
  const marker = await prisma.setting.findUnique({
    where: { churchId_key: { churchId, key: 'site_content_seeded' } },
  });
  if (marker?.value === 'true') {
    console.log('  Website content already present — skip');
    return;
  }

  console.log('  Seeding default website content…');

  await prisma.siteSlide.createMany({
    data: [
      {
        churchId,
        title: `Welcome to ${churchName}`,
        subtitle: 'True Worship · True Witness — Experience the transforming power of God.',
        sortOrder: 0,
        ctaLabel: 'Plan Your Visit',
        ctaUrl: '/contact',
        isActive: true,
      },
      {
        churchId,
        title: 'A Community of Faith & Fire',
        subtitle: 'Join us as we worship, grow, and reach our city with the gospel.',
        sortOrder: 1,
        ctaLabel: 'Watch Sermons',
        ctaUrl: '/about',
        isActive: true,
      },
    ],
  });

  await prisma.siteSection.createMany({
    data: [
      {
        churchId,
        pageSlug: 'home',
        type: 'WELCOME',
        title: 'Welcome Home',
        subtitle: 'A Pentecostal family committed to true worship and true witness.',
        body: 'We are a Spirit-led church passionate about worship, discipleship, and community impact. Whether you are exploring faith for the first time or looking for a church home, you belong here.',
        sortOrder: 0,
        ctaLabel: 'Learn About Us',
        ctaUrl: '/about',
        isActive: true,
      },
      {
        churchId,
        pageSlug: 'home',
        type: 'VISION',
        title: 'Our Vision',
        body: 'To raise a generation that worships in spirit and truth, walks in power, and transforms nations through the gospel of Jesus Christ.',
        sortOrder: 1,
        isActive: true,
      },
      {
        churchId,
        pageSlug: 'home',
        type: 'MISSION',
        title: 'Our Mission',
        body: 'To win souls, make disciples, equip believers for ministry, and demonstrate God\'s love through worship, word, and works of compassion.',
        sortOrder: 2,
        isActive: true,
      },
      {
        churchId,
        pageSlug: 'home',
        type: 'CTA',
        title: 'Join Us This Sunday',
        subtitle: 'You are invited to experience vibrant worship and life-changing teaching.',
        body: 'Come as you are. Leave transformed by the presence of God.',
        sortOrder: 3,
        ctaLabel: 'Contact Us',
        ctaUrl: '/contact',
        isActive: true,
      },
    ],
  });

  await prisma.sitePage.createMany({
    data: [
      {
        churchId,
        slug: 'about',
        title: 'About Us',
        subtitle: 'Who we are and what we believe',
        body: `<h2>Our Story</h2>
<p>${churchName} is a Pentecostal ministry committed to authentic worship, biblical teaching, and Spirit-empowered living. We believe in the full gospel — salvation, baptism in the Holy Spirit, divine healing, and the soon return of our Lord Jesus Christ.</p>
<h2>What We Believe</h2>
<ul>
<li>The Bible is the inspired Word of God</li>
<li>Jesus Christ is Lord and Saviour</li>
<li>The Holy Spirit empowers believers for ministry</li>
<li>The Church is called to worship, witness, and serve</li>
</ul>
<h2>Our Culture</h2>
<p>We are a family — diverse, welcoming, and passionate about seeing lives transformed by the power of God. From our worship services to our community outreaches, everything we do points people to Jesus.</p>`,
        status: 'PUBLISHED',
        sortOrder: 0,
        metaDescription: `Learn about ${churchName} — our story, beliefs, and mission.`,
      },
      {
        churchId,
        slug: 'contact',
        title: 'Contact Us',
        subtitle: 'We would love to hear from you',
        body: `<p>Have a question, prayer request, or want to plan your visit? Reach out to us using the form on this page or contact us directly. Our team is here to help.</p>`,
        status: 'PUBLISHED',
        sortOrder: 1,
      },
      {
        churchId,
        slug: 'give',
        title: 'Online Giving',
        subtitle: 'Give cheerfully and support the work of the ministry',
        body: `<p>Your generosity enables us to spread the gospel, care for our community, and advance the kingdom of God. Thank you for partnering with us through your giving.</p>`,
        status: 'PUBLISHED',
        sortOrder: 2,
      },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { churchId, key: 'giving_intro', value: 'Thank you for your generous heart. Your giving supports worship, missions, and community outreach.' },
      { churchId, key: 'giving_instructions', value: 'Use bank transfer details below or give securely online via Paystack when enabled.' },
      { churchId, key: 'pastor_name', value: 'Pastor Joseph Gee' },
      { churchId, key: 'pastor_title', value: 'Senior Pastor' },
      {
        churchId,
        key: 'pastor_bio',
        value:
          'Pastor Joseph Gee leads Power And Glory Generation with a passion for Spirit-led worship, sound biblical teaching, and reaching every generation with the gospel.\n\nUnder his leadership, the church has grown into a vibrant family committed to true worship, true witness, and community transformation across Lagos and beyond.',
      },
      { churchId, key: 'about_founded', value: '2010' },
      {
        churchId,
        key: 'about_story',
        value: `<p>${churchName} began as a small prayer gathering with a vision to raise a worshipping, witnessing generation. Today we are a multi-generational Pentecostal family — children, youth, adults, and seniors — united by our love for Jesus and our commitment to the Great Commission.</p><p>We believe the local church is God's instrument for transforming lives, families, and communities. Every Sunday and throughout the week, we gather to worship, learn God's Word, pray, and serve together.</p>`,
      },
      {
        churchId,
        key: 'about_beliefs',
        value: [
          'The Bible is the inspired and authoritative Word of God',
          'Jesus Christ is Lord and Saviour — born of the Virgin Mary, crucified, risen, and coming again',
          'Salvation is by grace through faith in Jesus Christ',
          'The baptism in the Holy Spirit empowers believers for life and ministry',
          'Divine healing is available through faith in Christ',
          'The Church is called to worship God, witness to the world, and serve our community',
        ].join('\n'),
      },
      {
        churchId,
        key: 'about_values',
        value: [
          'Authentic Worship',
          'Biblical Teaching',
          'Spirit-Empowered Living',
          'Generational Discipleship',
          'Community Impact',
          'Excellence in Ministry',
        ].join('\n'),
      },
      { churchId, key: 'site_content_seeded', value: 'true' },
    ],
    skipDuplicates: true,
  });

  console.log('  Website content ready (slides, sections, pages)');
}

async function seedDemoData(
  churchId: string,
  hqId: string,
  adminId: string,
) {
  const marker = await prisma.setting.findUnique({
    where: { churchId_key: { churchId, key: 'demo_data_seeded' } },
  });
  if (marker?.value === 'true') {
    console.log('  Demo data already present — skip (run db:reset to re-seed)');
    return;
  }

  console.log('  Seeding demo data…');

  const ikj = await prisma.branch.upsert({
    where: { churchId_code: { churchId, code: 'IKJ' } },
    update: {},
    create: {
      churchId,
      name: 'Ikeja Campus',
      code: 'IKJ',
      city: 'Ikeja',
      state: 'Lagos',
      address: '45 Allen Avenue, Ikeja',
      phone: '08011223344',
      email: 'ikeja@church.local',
      country: 'Nigeria',
    },
  });

  // ---- Members (HQ) ----
  const pastorSamuel = await prisma.member.create({
    data: {
      branchId: hqId,
      membershipNumber: 'HQ-0101',
      firstName: 'Samuel',
      lastName: 'Adeyemi',
      gender: 'MALE',
      maritalStatus: 'MARRIED',
      status: 'LEADER',
      pastoralRole: 'PASTOR',
      email: 'samuel.adeyemi@church.local',
      phone: '08030001001',
      city: 'Lagos',
      state: 'Lagos',
      occupation: 'Senior Pastor',
      joinedAt: daysFromNow(-1200),
      isBaptizedWater: true,
      isBaptizedSpirit: true,
    },
  });

  const pastorGrace = await prisma.member.create({
    data: {
      branchId: hqId,
      membershipNumber: 'HQ-0102',
      firstName: 'Grace',
      lastName: 'Okon',
      gender: 'FEMALE',
      maritalStatus: 'MARRIED',
      status: 'LEADER',
      pastoralRole: 'ASSISTANT_PASTOR',
      email: 'grace.okon@church.local',
      phone: '08030001002',
      city: 'Lagos',
      state: 'Lagos',
      occupation: 'Assistant Pastor',
      joinedAt: daysFromNow(-800),
      isBaptizedWater: true,
      isBaptizedSpirit: true,
    },
  });

  const hqMembers = await Promise.all(
    [
      { num: 'HQ-0103', firstName: 'Chidi', lastName: 'Okafor', gender: 'MALE' as const, status: 'WORKER' as const, phone: '08030001003', occupation: 'Usher' },
      { num: 'HQ-0104', firstName: 'Amaka', lastName: 'Nwosu', gender: 'FEMALE' as const, status: 'WORKER' as const, phone: '08030001004', occupation: 'Choir Director' },
      { num: 'HQ-0105', firstName: 'Emeka', lastName: 'Bello', gender: 'MALE' as const, status: 'MEMBER' as const, phone: '08030001005', occupation: 'Accountant' },
      { num: 'HQ-0106', firstName: 'Fatima', lastName: 'Yusuf', gender: 'FEMALE' as const, status: 'MEMBER' as const, phone: '08030001006', occupation: 'Teacher' },
      { num: 'HQ-0107', firstName: 'Tunde', lastName: 'Bakare', gender: 'MALE' as const, status: 'MEMBER' as const, phone: '08030001007', occupation: 'Engineer' },
      { num: 'HQ-0108', firstName: 'Blessing', lastName: 'Eze', gender: 'FEMALE' as const, status: 'NEW_CONVERT' as const, phone: '08030001008', occupation: 'Student' },
      { num: 'HQ-0109', firstName: 'Ibrahim', lastName: 'Musa', gender: 'MALE' as const, status: 'FIRST_TIMER' as const, phone: '08030001009', occupation: 'Trader' },
      { num: 'HQ-0110', firstName: 'Ngozi', lastName: 'Chukwu', gender: 'FEMALE' as const, status: 'VISITOR' as const, phone: '08030001010', occupation: 'Nurse' },
    ].map((m) =>
      prisma.member.create({
        data: {
          branchId: hqId,
          membershipNumber: m.num,
          firstName: m.firstName,
          lastName: m.lastName,
          gender: m.gender,
          status: m.status,
          phone: m.phone,
          occupation: m.occupation,
          city: 'Lagos',
          state: 'Lagos',
          joinedAt: daysFromNow(-Math.floor(Math.random() * 300 + 30)),
          isBaptizedWater: m.status !== 'VISITOR' && m.status !== 'FIRST_TIMER',
        },
      }),
    ),
  );

  const [chidi, amaka, emeka, fatima, tunde, blessing] = hqMembers;

  await prisma.branch.update({
    where: { id: hqId },
    data: { branchPastorId: pastorSamuel.id, assistantPastorId: pastorGrace.id },
  });

  // ---- Members (Ikeja) ----
  const pastorDavid = await prisma.member.create({
    data: {
      branchId: ikj.id,
      membershipNumber: 'IKJ-0101',
      firstName: 'David',
      lastName: 'Eze',
      gender: 'MALE',
      status: 'LEADER',
      pastoralRole: 'PASTOR',
      phone: '08040001001',
      city: 'Ikeja',
      state: 'Lagos',
      joinedAt: daysFromNow(-600),
    },
  });

  const pastorRuth = await prisma.member.create({
    data: {
      branchId: ikj.id,
      membershipNumber: 'IKJ-0102',
      firstName: 'Ruth',
      lastName: 'Bello',
      gender: 'FEMALE',
      status: 'LEADER',
      pastoralRole: 'ASSISTANT_PASTOR',
      phone: '08040001002',
      city: 'Ikeja',
      state: 'Lagos',
      joinedAt: daysFromNow(-400),
    },
  });

  const ikjMembers = await Promise.all(
    ['IKJ-0103', 'IKJ-0104', 'IKJ-0105', 'IKJ-0106'].map((num, i) =>
      prisma.member.create({
        data: {
          branchId: ikj.id,
          membershipNumber: num,
          firstName: ['James', 'Mary', 'Peter', 'Sarah'][i],
          lastName: ['Adebayo', 'Ogunleye', 'Aliyu', 'Okoro'][i],
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          status: i < 2 ? 'WORKER' : 'MEMBER',
          phone: `0804000100${i + 3}`,
          city: 'Ikeja',
          state: 'Lagos',
          joinedAt: daysFromNow(-200 - i * 20),
        },
      }),
    ),
  );

  await prisma.branch.update({
    where: { id: ikj.id },
    data: { branchPastorId: pastorDavid.id, assistantPastorId: pastorRuth.id },
  });

  // ---- Life events ----
  await prisma.memberLifeEvent.createMany({
    data: [
      { memberId: blessing.id, type: 'NEW_BIRTH', title: 'New birth decision', eventDate: daysFromNow(-14) },
      { memberId: emeka.id, type: 'BAPTISM', title: 'Water baptism', eventDate: daysFromNow(-365) },
      { memberId: pastorSamuel.id, type: 'ORDINATION', title: 'Ordained as Senior Pastor', eventDate: daysFromNow(-1000) },
    ],
  });

  // ---- Departments ----
  const choir = await prisma.department.create({
    data: { branchId: hqId, name: 'Choir', description: 'Worship & music ministry', leaderId: amaka.id },
  });
  const ushers = await prisma.department.create({
    data: { branchId: hqId, name: 'Ushering', description: 'Guest welcome & seating', leaderId: chidi.id },
  });
  const media = await prisma.department.create({
    data: { branchId: hqId, name: 'Media', description: 'Sound, lights & live stream' },
  });
  const ikjYouth = await prisma.department.create({
    data: { branchId: ikj.id, name: 'Youth Ministry', description: 'Teens & young adults' },
  });

  await prisma.memberDepartment.createMany({
    data: [
      { memberId: amaka.id, departmentId: choir.id },
      { memberId: emeka.id, departmentId: choir.id },
      { memberId: chidi.id, departmentId: ushers.id },
      { memberId: fatima.id, departmentId: ushers.id },
      { memberId: tunde.id, departmentId: media.id },
      { memberId: ikjMembers[0].id, departmentId: ikjYouth.id },
    ],
  });

  // ---- Groups ----
  const cellGroup = await prisma.group.create({
    data: {
      branchId: hqId,
      name: 'Victory Cell',
      category: 'Cell',
      leaderId: emeka.id,
      meetingDay: 'Wednesday',
      meetingTime: '18:30',
      location: 'Surulere',
    },
  });
  const fellowship = await prisma.group.create({
    data: {
      branchId: hqId,
      name: 'Men of Valour',
      category: 'Fellowship',
      leaderId: tunde.id,
      meetingDay: 'Saturday',
      meetingTime: '07:00',
    },
  });

  await prisma.groupMember.createMany({
    data: [
      { groupId: cellGroup.id, memberId: emeka.id },
      { groupId: cellGroup.id, memberId: fatima.id },
      { groupId: cellGroup.id, memberId: blessing.id },
      { groupId: fellowship.id, memberId: tunde.id },
      { groupId: fellowship.id, memberId: chidi.id },
    ],
  });

  // ---- Attendance ----
  const sessions = await Promise.all(
    [0, 1, 2, 3].map((w) =>
      prisma.attendanceSession.create({
        data: {
          branchId: hqId,
          title: `Sunday Service — Week ${4 - w}`,
          type: 'SUNDAY_SERVICE',
          date: sundayAgo(w),
          maleCount: 85 + w * 3,
          femaleCount: 110 + w * 4,
          childrenCount: 45 + w,
          newcomerCount: 5 - w,
          totalCount: 240 + w * 8,
          createdById: adminId,
        },
      }),
    ),
  );

  await prisma.attendanceRecord.createMany({
    data: sessions.flatMap((s) =>
      [chidi, amaka, emeka, fatima, tunde, blessing].map((m) => ({
        sessionId: s.id,
        memberId: m.id,
        present: true,
      })),
    ),
    skipDuplicates: true,
  });

  await prisma.attendanceSession.create({
    data: {
      branchId: ikj.id,
      title: 'Sunday Service',
      type: 'SUNDAY_SERVICE',
      date: sundayAgo(0),
      maleCount: 40,
      femaleCount: 55,
      childrenCount: 20,
      newcomerCount: 3,
      totalCount: 115,
    },
  });

  // ---- Finance ----
  const titheFund = await prisma.fund.create({
    data: { branchId: hqId, name: 'General Tithe', code: 'TITHE', description: 'Main tithe fund' },
  });
  const buildingFund = await prisma.fund.create({
    data: { branchId: hqId, name: 'Building Project', code: 'BLD', description: 'Sanctuary expansion' },
  });
  const missionsFund = await prisma.fund.create({
    data: { branchId: hqId, name: 'Missions Fund', code: 'MIS', description: 'Outreach & missions support' },
  });

  const givingTypeNames = [
    { name: 'Tithe', description: 'Regular tithe giving' },
    { name: 'Offering', description: 'Sunday and special offerings' },
    { name: 'Building', description: 'Building project contributions' },
    { name: 'Donation', description: 'General donations' },
    { name: 'Thanksgiving', description: 'Thanksgiving offerings' },
    { name: 'Missions', description: 'Missions & outreach giving' },
    { name: 'Welfare', description: 'Welfare & benevolence' },
    { name: 'Online Giving', description: 'Paystack and other online donations' },
  ];
  const givingTypes = await Promise.all(
    givingTypeNames.map((gt) =>
      prisma.givingType.create({ data: { branchId: hqId, ...gt } }),
    ),
  );
  const gt = Object.fromEntries(givingTypes.map((t) => [t.name, t.id])) as Record<string, string>;

  const expenseCatNames = [
    { name: 'Utilities', description: 'Power, water, diesel' },
    { name: 'Construction', description: 'Building & renovation' },
    { name: 'Salaries', description: 'Staff payroll' },
    { name: 'Office Supplies', description: 'Stationery & consumables' },
    { name: 'Maintenance', description: 'Repairs & upkeep' },
    { name: 'Outreach', description: 'Evangelism & community programs' },
    { name: 'Equipment', description: 'AV, furniture, instruments' },
  ];
  const expenseCats = await Promise.all(
    expenseCatNames.map((ec) =>
      prisma.expenseCategory.create({ data: { branchId: hqId, ...ec } }),
    ),
  );
  const ec = Object.fromEntries(expenseCats.map((c) => [c.name, c.id])) as Record<string, string>;

  await prisma.contribution.createMany({
    data: [
      { branchId: hqId, fundId: titheFund.id, memberId: emeka.id, givingTypeId: gt.Tithe, amount: 150000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01001', contributedAt: daysFromNow(-7), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: fatima.id, givingTypeId: gt.Tithe, amount: 85000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01002', contributedAt: daysFromNow(-7), recordedById: adminId },
      { branchId: hqId, fundId: buildingFund.id, memberId: tunde.id, givingTypeId: gt.Building, amount: 500000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01003', contributedAt: daysFromNow(-14), recordedById: adminId },
      { branchId: hqId, givingTypeId: gt.Offering, amount: 320000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01004', contributedAt: sundayAgo(0), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: chidi.id, givingTypeId: gt.Donation, amount: 25000, paymentMethod: 'POS', receiptNumber: 'RCP-2026-01005', contributedAt: daysFromNow(-3), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: amaka.id, givingTypeId: gt.Tithe, amount: 120000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01006', contributedAt: daysFromNow(-35), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: blessing.id, givingTypeId: gt.Tithe, amount: 45000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01007', contributedAt: daysFromNow(-35), recordedById: adminId },
      { branchId: hqId, givingTypeId: gt.Offering, amount: 285000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01008', contributedAt: sundayAgo(1), recordedById: adminId },
      { branchId: hqId, givingTypeId: gt.Offering, amount: 310000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01009', contributedAt: sundayAgo(2), recordedById: adminId },
      { branchId: hqId, fundId: buildingFund.id, memberId: emeka.id, givingTypeId: gt.Building, amount: 200000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01010', contributedAt: daysFromNow(-45), recordedById: adminId },
      { branchId: hqId, fundId: missionsFund.id, memberId: fatima.id, givingTypeId: gt.Missions, amount: 75000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01011', contributedAt: daysFromNow(-60), recordedById: adminId },
      { branchId: hqId, fundId: missionsFund.id, givingTypeId: gt.Missions, amount: 50000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01012', contributedAt: daysFromNow(-90), recordedById: adminId },
      { branchId: hqId, givingTypeId: gt.Thanksgiving, amount: 180000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01013', contributedAt: daysFromNow(-120), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: tunde.id, givingTypeId: gt.Tithe, amount: 95000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01014', contributedAt: daysFromNow(-65), recordedById: adminId },
      { branchId: hqId, fundId: buildingFund.id, memberId: chidi.id, givingTypeId: gt.Building, amount: 700000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01015', contributedAt: daysFromNow(-20), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: emeka.id, givingTypeId: gt.Welfare, amount: 30000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01016', contributedAt: daysFromNow(-15), recordedById: adminId },
      { branchId: hqId, givingTypeId: gt.Offering, amount: 295000, paymentMethod: 'CASH', receiptNumber: 'RCP-2026-01017', contributedAt: sundayAgo(3), recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, memberId: fatima.id, givingTypeId: gt.Tithe, amount: 90000, paymentMethod: 'TRANSFER', receiptNumber: 'RCP-2026-01018', contributedAt: daysFromNow(-95), recordedById: adminId },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { branchId: hqId, fundId: titheFund.id, categoryId: ec.Utilities, description: 'PHCN & generator diesel', amount: 185000, expenseDate: daysFromNow(-10), paidTo: 'IKEDC', recordedById: adminId },
      { branchId: hqId, fundId: buildingFund.id, categoryId: ec.Construction, description: 'Block supply — Phase 2', amount: 1200000, expenseDate: daysFromNow(-20), paidTo: 'BuildRight Ltd', recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, categoryId: ec.Salaries, description: 'March staff payroll', amount: 850000, expenseDate: daysFromNow(-25), paidTo: 'Staff payroll', recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, categoryId: ec['Office Supplies'], description: 'Printer toner & paper', amount: 45000, expenseDate: daysFromNow(-18), paidTo: 'Office Mart', recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, categoryId: ec.Maintenance, description: 'AC servicing — main auditorium', amount: 95000, expenseDate: daysFromNow(-40), paidTo: 'CoolAir Services', recordedById: adminId },
      { branchId: hqId, fundId: missionsFund.id, categoryId: ec.Outreach, description: 'Makoko outreach supplies', amount: 120000, expenseDate: daysFromNow(-30), paidTo: 'Various vendors', recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, categoryId: ec.Equipment, description: 'Wireless mic replacement', amount: 78000, expenseDate: daysFromNow(-55), paidTo: 'SoundPro NG', recordedById: adminId },
      { branchId: hqId, fundId: buildingFund.id, categoryId: ec.Construction, description: 'Roofing materials', amount: 450000, expenseDate: daysFromNow(-75), paidTo: 'RoofMasters', recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, categoryId: ec.Utilities, description: 'February utilities', amount: 165000, expenseDate: daysFromNow(-65), paidTo: 'IKEDC', recordedById: adminId },
      { branchId: hqId, fundId: titheFund.id, categoryId: ec.Salaries, description: 'February staff payroll', amount: 850000, expenseDate: daysFromNow(-55), paidTo: 'Staff payroll', recordedById: adminId },
    ],
  });

  await prisma.pledge.createMany({
    data: [
      {
        branchId: hqId,
        memberId: emeka.id,
        campaign: 'Building Project',
        amount: 2000000,
        fulfilledAmount: 500000,
        status: 'ACTIVE',
        dueDate: daysFromNow(180),
        note: 'Building pledge — 6 months',
      },
      {
        branchId: hqId,
        memberId: tunde.id,
        campaign: 'Building Project',
        amount: 1500000,
        fulfilledAmount: 700000,
        status: 'ACTIVE',
        dueDate: daysFromNow(120),
        note: 'Sanctuary expansion pledge',
      },
      {
        branchId: hqId,
        memberId: fatima.id,
        campaign: 'Missions 2026',
        amount: 500000,
        fulfilledAmount: 75000,
        status: 'ACTIVE',
        dueDate: daysFromNow(200),
      },
    ],
  });

  // ---- HR ----
  const empPastor = await prisma.employee.create({
    data: {
      branchId: hqId,
      employeeNumber: 'EMP-001',
      firstName: pastorSamuel.firstName,
      lastName: pastorSamuel.lastName,
      email: pastorSamuel.email,
      phone: pastorSamuel.phone,
      position: 'Senior Pastor',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      hireDate: daysFromNow(-1200),
      baseSalary: 450000,
      bankName: 'GTBank',
      bankAccountNo: '0123456789',
    },
  });

  const empAdmin = await prisma.employee.create({
    data: {
      branchId: hqId,
      employeeNumber: 'EMP-002',
      firstName: 'Funke',
      lastName: 'Adeleke',
      email: 'funke.adeleke@church.local',
      phone: '08030002001',
      position: 'Church Administrator',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      hireDate: daysFromNow(-400),
      baseSalary: 280000,
    },
  });

  await prisma.salaryComponent.createMany({
    data: [
      { employeeId: empPastor.id, name: 'Housing Allowance', type: 'ALLOWANCE', amount: 100000 },
      { employeeId: empPastor.id, name: 'Transport', type: 'ALLOWANCE', amount: 50000 },
      { employeeId: empAdmin.id, name: 'Transport', type: 'ALLOWANCE', amount: 30000 },
    ],
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: empAdmin.id,
      type: 'ANNUAL',
      startDate: daysFromNow(14),
      endDate: daysFromNow(21),
      days: 7,
      reason: 'Family vacation',
      status: 'PENDING',
    },
  });

  const payRun = await prisma.payRun.create({
    data: {
      branchId: hqId,
      title: 'May 2026 Payroll',
      period: '2026-05',
      status: 'PROCESSED',
      runDate: daysFromNow(-15),
      createdById: adminId,
    },
  });

  await prisma.payslip.createMany({
    data: [
      {
        payRunId: payRun.id,
        employeeId: empPastor.id,
        baseSalary: 450000,
        totalAllowances: 150000,
        totalDeductions: 0,
        grossPay: 600000,
        netPay: 600000,
      },
      {
        payRunId: payRun.id,
        employeeId: empAdmin.id,
        baseSalary: 280000,
        totalAllowances: 30000,
        totalDeductions: 0,
        grossPay: 310000,
        netPay: 310000,
      },
    ],
  });

  // ---- Content ----
  const faithSeries = await prisma.sermonSeries.create({
    data: { branchId: hqId, name: 'Faith Series', description: 'Messages on walking by faith.' },
  });
  const prayerSeries = await prisma.sermonSeries.create({
    data: { branchId: hqId, name: 'Prayer Month', description: 'Teaching series on prayer.' },
  });

  await prisma.sermon.createMany({
    data: [
      { branchId: hqId, seriesId: faithSeries.id, title: 'Walking in Faith', speaker: 'Pastor Samuel Adeyemi', scripture: 'Hebrews 11:1', summary: 'Understanding biblical faith in daily life.', preachedAt: sundayAgo(1), isPublished: true, createdById: adminId },
      { branchId: hqId, seriesId: prayerSeries.id, title: 'The Power of Prayer', speaker: 'Pastor Grace Okon', scripture: 'James 5:16', preachedAt: sundayAgo(2), isPublished: true, createdById: adminId },
      { branchId: ikj.id, title: 'Fruit of the Spirit', speaker: 'Pastor David Eze', preachedAt: sundayAgo(0), isPublished: true },
    ],
  });

  const healingCat = await prisma.testimonyCategory.create({
    data: { name: 'Healing', description: 'Physical and emotional healing testimonies.' },
  });
  const provisionCat = await prisma.testimonyCategory.create({
    data: { name: 'Provision', description: 'Financial and material provision.' },
  });
  const deliveranceCat = await prisma.testimonyCategory.create({
    data: { name: 'Deliverance', description: 'Freedom and deliverance stories.' },
  });

  await prisma.testimony.createMany({
    data: [
      { memberId: blessing.id, title: 'Healed from illness', body: 'After months of prayer, I received complete healing during our healing service. God is faithful!', categoryId: healingCat.id, status: 'APPROVED', isFeatured: true, occurredAt: daysFromNow(-10) },
      { memberId: fatima.id, title: 'Job provision', body: 'I lost my job in January but God opened a better door through a member of the church.', categoryId: provisionCat.id, status: 'APPROVED', occurredAt: daysFromNow(-30) },
      { authorName: 'Anonymous', title: 'Deliverance from addiction', body: 'Through counselling and prayer, I am free after 5 years of struggle.', categoryId: deliveranceCat.id, status: 'PENDING' },
    ],
  });

  const youthEvent = await prisma.event.create({
    data: {
      branchId: hqId,
      title: 'Youth Convention 2026',
      description: 'Three-day youth gathering with worship, workshops, and outreach.',
      location: 'Headquarters Main Auditorium',
      startAt: daysFromNow(21, 9),
      endAt: daysFromNow(23, 18),
      capacity: 500,
      status: 'PUBLISHED',
      createdById: adminId,
    },
  });

  await prisma.event.create({
    data: {
      branchId: hqId,
      title: 'Leadership Retreat',
      description: 'Annual workers and leaders retreat.',
      location: 'Epe Resort',
      startAt: daysFromNow(45, 8),
      endAt: daysFromNow(47, 16),
      status: 'DRAFT',
    },
  });

  await prisma.eventRegistration.createMany({
    data: [
      { eventId: youthEvent.id, memberId: blessing.id },
      { eventId: youthEvent.id, memberId: chidi.id, attended: false },
    ],
  });

  await prisma.outreachType.createMany({
    data: [
      { branchId: hqId, name: 'Charity', description: 'Food, clothing and welfare outreaches.' },
      { branchId: hqId, name: 'Evangelism', description: 'Street and door-to-door evangelism.' },
      { branchId: ikj.id, name: 'Medical', description: 'Hospital visits and medical missions.' },
    ],
  });

  const charityType = await prisma.outreachType.findFirst({ where: { branchId: hqId, name: 'Charity' } });
  const evangelismType = await prisma.outreachType.findFirst({ where: { branchId: hqId, name: 'Evangelism' } });
  const medicalType = await prisma.outreachType.findFirst({ where: { branchId: ikj.id, name: 'Medical' } });

  await prisma.outreach.createMany({
    data: [
      { branchId: hqId, typeId: charityType!.id, title: 'Makoko Community Outreach', state: 'Lagos', location: 'Makoko, Lagos', description: 'Food & clothing distribution', startAt: daysFromNow(-30), status: 'COMPLETED', peopleReached: 120, souls: 85, coordinator: 'Pastor Grace Okon' },
      { branchId: hqId, typeId: evangelismType!.id, title: 'Street Evangelism — CMS', state: 'Lagos', location: 'CMS, Lagos Island', startAt: daysFromNow(7), status: 'PLANNED', coordinator: 'Chidi Okafor' },
      { branchId: ikj.id, typeId: medicalType!.id, title: 'Hospital Visit — Ikeja General', state: 'Lagos', location: 'Ikeja General Hospital', startAt: daysFromNow(14), status: 'PLANNED', peopleReached: 0 },
    ],
  });

  // ---- Communication & follow-up ----
  await prisma.messageTemplate.createMany({
    data: [
      { name: 'Welcome — First Timer', channel: 'EMAIL', subject: 'Welcome to {{church}}!', body: 'Dear {{name}},\n\nThank you for worshipping with us. We are glad you came!', category: 'Welcome' },
      { name: 'Service Reminder', channel: 'SMS', body: 'Reminder: Join us this Sunday at 9 AM. God bless you! — {{church}}', category: 'Reminder' },
    ],
  });

  await prisma.followUp.createMany({
    data: [
      { branchId: hqId, memberId: hqMembers[7].id, type: 'FIRST_TIMER', status: 'OPEN', notes: 'Visited last Sunday — follow up with a welcome call.', dueDate: daysFromNow(1) },
      { branchId: hqId, memberId: blessing.id, type: 'NEW_CONVERT', status: 'IN_PROGRESS', notes: 'Enrolled in foundation class.', dueDate: daysFromNow(3), assignedToId: adminId },
      { branchId: hqId, memberId: hqMembers[6].id, type: 'ABSENTEE', status: 'OPEN', notes: 'Missed 3 consecutive Sundays.', dueDate: daysFromNow(-2) },
      { branchId: ikj.id, contactName: 'Michael Ade', contactPhone: '08050001001', type: 'PRAYER_REQUEST', status: 'OPEN', notes: 'Requested prayer for job search.', dueDate: daysFromNow(5) },
    ],
  });

  // ---- Bulk SMS ----
  const smsWallet = await prisma.smsWallet.upsert({
    where: { branchId: hqId },
    update: { balance: 5000 },
    create: { branchId: hqId, balance: 5000 },
  });
  await prisma.smsWalletTransaction.createMany({
    data: [
      {
        walletId: smsWallet.id,
        type: 'CREDIT',
        amount: 5000,
        description: 'Initial demo wallet credit',
        reference: 'DEMO-SEED',
      },
    ],
    skipDuplicates: true,
  });
  await prisma.smsPhoneGroup.createMany({
    data: [
      {
        branchId: hqId,
        name: 'Members — HQ',
        phoneNumbers: '2348034567890,2348076543210,2349012345678',
        createdById: adminId,
      },
      {
        branchId: hqId,
        name: 'Workers',
        phoneNumbers: '2348034512345,2348076512345',
        createdById: adminId,
      },
    ],
  });
  await prisma.smsSenderId.createMany({
    data: [
      {
        branchId: hqId,
        senderId: 'CHMS',
        purpose: 'Church announcements and service reminders',
        status: 'APPROVED',
        createdById: adminId,
      },
      {
        branchId: hqId,
        senderId: 'Gospel',
        purpose: 'Evangelism outreach messages',
        status: 'PENDING',
        createdById: adminId,
      },
    ],
  });
  await prisma.bulkSmsMessage.create({
    data: {
      branchId: hqId,
      senderIdLabel: 'SMS Channel',
      phoneNumbers: '2348034567890,2348076543210',
      message: 'Reminder: Join us this Sunday at 9 AM. God bless you!',
      pages: 1,
      recipientCount: 2,
      cost: 11.9,
      status: 'SENT',
      gateway: 'stub',
      sentById: adminId,
      sentAt: daysFromNow(-3),
    },
  });

  // ---- Church settings ----
  await prisma.setting.createMany({
    data: [
      { churchId, key: 'church_tagline', value: 'Raising disciples, transforming nations.' },
      { churchId, key: 'service_times', value: 'Sunday 9:00 AM & 11:00 AM | Wednesday 6:30 PM' },
      { churchId, key: 'demo_data_seeded', value: 'true' },
    ],
    skipDuplicates: true,
  });

  console.log('  Demo data ready:');
  console.log(`    • 2 branches (HQ + Ikeja)`);
  console.log(`    • 18 members (pastors, workers, visitors)`);
  console.log(`    • Departments, groups, attendance, finance, HR`);
  console.log(`    • Sermons, testimonies, events, outreaches, follow-ups, bulk SMS`);
}

async function main() {
  const churchName = process.env.DEFAULT_CHURCH_NAME ?? 'My Church';
  const currency = process.env.DEFAULT_CURRENCY ?? 'NGN';
  const locale = process.env.DEFAULT_LOCALE ?? 'en-NG';
  const timezone = process.env.DEFAULT_TIMEZONE ?? 'Africa/Lagos';

  const adminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@church.local';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

  console.log('Seeding database…');

  // 1. Church + main branch
  const church = await prisma.church.upsert({
    where: { slug: slugify(churchName) },
    update: { name: churchName, currency, locale, timezone },
    create: {
      name: churchName,
      slug: slugify(churchName),
      currency,
      locale,
      timezone,
    },
  });

  const branch = await prisma.branch.upsert({
    where: { churchId_code: { churchId: church.id, code: 'HQ' } },
    update: {},
    create: {
      churchId: church.id,
      name: 'Headquarters',
      code: 'HQ',
      isMain: true,
      city: 'Surulere',
      state: 'Lagos',
      address: '12 Church Street, Surulere',
      phone: '08099887766',
      country: 'Nigeria',
    },
  });
  console.log(`  Church "${church.name}" + branch "${branch.name}" ready`);

  // 2. Permissions
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { module: moduleOf(key), description: permissionLabel(key) },
      create: { key, module: moduleOf(key), description: permissionLabel(key) },
    });
  }
  console.log(`  ${ALL_PERMISSIONS.length} permissions ready`);

  // 3. System roles + their permissions
  for (const roleName of Object.values(SYSTEM_ROLES)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isSystem: true },
      create: { name: roleName, isSystem: true, description: `${roleName} (system role)` },
    });

    const permKeys = ROLE_PERMISSIONS[roleName] ?? [];
    if (permKeys.length > 0) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: permKeys } },
        select: { id: true },
      });
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`  ${Object.keys(SYSTEM_ROLES).length} system roles ready`);

  // 4. Super admin user
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: SYSTEM_ROLES.SUPER_ADMIN },
  });
  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      firstName: adminName.split(' ')[0] ?? 'Super',
      lastName: adminName.split(' ').slice(1).join(' ') || 'Admin',
      isSuperAdmin: true,
      isActive: true,
      branchId: branch.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });
  console.log(`  Super admin ready -> ${adminEmail}`);

  // 5. Default website content
  await seedSiteContent(church.id, church.name);

  // 6. Demo / dummy data
  await seedDemoData(church.id, branch.id, admin.id);

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

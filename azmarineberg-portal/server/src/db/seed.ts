import 'dotenv/config';
import { pool } from './pool.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const ZONES: Record<string, string[]> = {
  'North-Central': ['FCT', 'Benue', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau'],
  'North-East': ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
  'North-West': ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  'South-East': ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  'South-South': ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  'South-West': ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
};

const INDUSTRY_SECTORS = [
  'Manufacturing', 'Oil & Gas', 'FMCG', 'Construction', 'Mining',
  'Healthcare', 'Energy', 'Agriculture', 'Transportation', 'Telecommunications', 'Other',
];

async function seed() {
  const client = await pool.connect();

  try {
    // Super Admin user
    const adminHash = await bcrypt.hash('SuperAdmin123!', SALT_ROUNDS);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, role, company_id)
       VALUES ($1, $2, 'super_admin', NULL)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['superadmin@azmarineberg.com', adminHash]
    );

    if (adminResult.rows[0]) {
      console.log('Created Super Admin: superadmin@azmarineberg.com / SuperAdmin123!');
    }

    const adminUserHash = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    await client.query(
      `INSERT INTO users (email, password_hash, role, company_id)
       VALUES ($1, $2, 'admin', NULL)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@azmarineberg.com', adminUserHash]
    );
    console.log('Created Admin: admin@azmarineberg.com / Admin123!');

    // Regulators
    const regulators = [
      { name: 'Federal Ministry of Environment', code: 'FMEnv', level: 'federal' },
      { name: 'National Environmental Standards and Regulations Enforcement Agency', code: 'NESREA', level: 'federal' },
      { name: 'National Biosafety Management Agency', code: 'NBMA', level: 'federal' },
      { name: 'Nigerian Midstream and Downstream Petroleum Regulatory Authority', code: 'NMDPRA', level: 'federal' },
      { name: 'Lagos State Environmental Protection Agency', code: 'LASEPA', level: 'state' },
      { name: 'Lagos State Waste Management Authority', code: 'LAWMA', level: 'state' },
      { name: 'Lagos State Safety Commission', code: 'LSSC', level: 'state' },
      { name: 'Ogun State Environmental Protection Agency', code: 'OGEPA', level: 'state' },
      { name: 'Ogun State Waste Management Authority', code: 'OGWAMA', level: 'state' },
      { name: 'Ogun State Ministry of Environment', code: 'OGMOE', level: 'state' },
      { name: 'Kwara State Environmental Protection Agency', code: 'KWEPA', level: 'state' },
      { name: 'Environmental Health Officers Registration Council of Nigeria', code: 'EHORECON', level: 'federal' },
    ];

    for (const r of regulators) {
      await client.query(
        `INSERT INTO regulators (name, code, level)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`,
        [r.name, r.code, r.level]
      );
    }
    console.log(`Seeded ${regulators.length} regulators`);

    // Service types (linked to NESREA as default - we'll get regulator id)
    const nesreaResult = await client.query(`SELECT id FROM regulators WHERE code = 'NESREA' LIMIT 1`);
    const nesreaId = nesreaResult.rows[0]?.id;
    const lasepaResult = await client.query(`SELECT id FROM regulators WHERE code = 'LASEPA' LIMIT 1`);
    const lasepaId = lasepaResult.rows[0]?.id;

    const serviceTypes = [
      { name: 'Environmental Impact Assessment', code: 'EIA', regulator_id: nesreaId },
      { name: 'Environmental Audit Report', code: 'EAR', regulator_id: nesreaId },
      { name: 'Environmental Management Plan', code: 'EMP', regulator_id: nesreaId },
      { name: 'Environmental Permit', code: 'EP', regulator_id: nesreaId },
      { name: 'Air Quality Monitoring', code: 'AQM', regulator_id: nesreaId },
      { name: 'Effluent Discharge Monitoring', code: 'EDM', regulator_id: nesreaId },
      { name: 'Pre-assessment', code: 'PA', regulator_id: nesreaId },
      { name: 'Compliance Status', code: 'CS', regulator_id: nesreaId },
      { name: 'Environmental Baseline Study', code: 'EBS', regulator_id: nesreaId },
      { name: 'Environmental Technical Report', code: 'ETR', regulator_id: lasepaId },
    ];

    for (const st of serviceTypes) {
      if (st.regulator_id) {
        await client.query(
          `INSERT INTO service_types (name, code, regulator_id)
           SELECT $1, $2, $3
           WHERE NOT EXISTS (SELECT 1 FROM service_types WHERE code = $4)`,
          [st.name, st.code, st.regulator_id, st.code]
        );
      }
    }
    console.log(`Seeded ${serviceTypes.length} service types`);

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

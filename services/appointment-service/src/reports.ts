import { createConnection } from 'typeorm';

const replicaConnection = await createConnection({
  type: 'postgres',
  host: process.env.POSTGRES_REPLICA_HOST,
  // read-only connection
});

export async function generateDoctorReport(doctorId: string) {
  return await replicaConnection.query(`
    SELECT 
      DATE(date_time) as date,
      COUNT(*) as total_appointments,
      AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completion_rate
    FROM appointments
    WHERE doctor_id = $1
    GROUP BY DATE(date_time)
  `, [doctorId]);
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    patientId: string;

    @Column()
    doctorId: string;

    @Column()
    dateTime: Date;

    @Column()
    status: string; // pending, confirmed, cancelled

    @CreateDateColumn()
    createdAt: Date;
}

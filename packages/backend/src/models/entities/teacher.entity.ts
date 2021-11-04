import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ClassEntity } from "../entities/class.entity";
import { Teacher } from "../interfaces/Teacher";

@Entity('teacher')
export class TeacherEntity implements Teacher {

    @PrimaryGeneratedColumn()
    id:number;

    @CreateDateColumn()
    createdAt: Date;

    @Column('varchar', { length: 255 })
    name:string;

    @Column('varchar', { length: 255 })
    department:string

    @Column('decimal', { precision: 3, scale: 2 })
    overallRating:number

    @Column('decimal', { precision: 3, scale: 2 })
    recognizesStudentDifficulties:number

    @Column('decimal', { precision: 3, scale: 2 })
    presentsMaterialClearly:number

    @Column('int')
    numberOfEvaluations:number

    @OneToMany(() => ClassEntity, c => c.teacher, {cascade:true})
    classes:ClassEntity[]

}
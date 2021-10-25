import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ReviewEntity } from "./review.entitiy";
import { TeacherEntity } from "../entities/teacher.entity";

@Entity('class')
export class ClassEntity {

    @PrimaryGeneratedColumn()
    id:number;

    @CreateDateColumn()
    createdAt: Date;

    @Column('varchar', { length:255 })
    name:string

    @OneToMany(() => ReviewEntity, review => review.class, { cascade: true })
    reviews:ReviewEntity[]

    @ManyToOne(() => TeacherEntity, teacher => teacher.classes)
    teacher:TeacherEntity

}
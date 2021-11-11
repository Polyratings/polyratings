import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReviewEntry } from "@polyratings-revamp/shared";
import { ClassEntity } from "./class.entity";
import { UserEntity } from "./user.entity";

@Entity('review')
export class ReviewEntity implements ReviewEntry {
    @PrimaryGeneratedColumn()
    id:number;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => ClassEntity, c => c.reviews)
    class:ClassEntity

    @ManyToOne(() => UserEntity, user => user.reviews)
    user:UserEntity

    @Column('varchar', { length: 255 })
    year:string

    @Column('varchar', { length: 255 })
    grade:string

    @Column('varchar', { length: 255 })
    reasonForTaking:string

    @Column('text')
    text:string

    @Column('int',{default:0})
    reportCount:number
}
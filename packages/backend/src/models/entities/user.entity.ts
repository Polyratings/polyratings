import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ReviewEntity } from "./review.entitiy";

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id:number;

    @CreateDateColumn()
    createdAt: Date;

    @Column()
    email:string

    @Column()
    password:string

    @Column()
    otp:string

    @Column({default:false})
    emailConfirmed:boolean

    @OneToMany(() => ReviewEntity, c => c.user, {cascade:true})
    reviews:ReviewEntity[]

}
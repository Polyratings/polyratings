import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ClassEntity } from 'src/models/entities/class.entity';
import { ReviewEntity } from 'src/models/entities/review.entitiy';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports:[
    TypeOrmModule.forFeature([TeacherEntity, ClassEntity, ReviewEntity]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}

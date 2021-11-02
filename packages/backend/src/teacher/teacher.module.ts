import { Module } from '@nestjs/common';
import { TeacherService } from './services/teacher.service';
import { TeacherController } from './controller/teacher.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { ClassEntity } from 'src/models/entities/class.entity';
import { ReviewEntity } from 'src/models/entities/review.entitiy';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherEntity, ClassEntity, ReviewEntity]),
    AuthModule
  ],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports:[TeacherService]
})
export class TeacherModule {}

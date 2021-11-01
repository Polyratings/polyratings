import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherEntity } from 'src/models/entities/teacher.entity';
import { ClassEntity } from 'src/models/entities/class.entity';
import { ReviewEntity } from 'src/models/entities/review.entitiy';
import { AuthModule } from 'src/auth/auth.module';
import { TeacherModule } from 'src/teacher/teacher.module';

@Module({
  imports:[
    TypeOrmModule.forFeature([TeacherEntity, ClassEntity, ReviewEntity]),
    AuthModule,
    TeacherModule
  ],
  providers: [ReviewService],
  controllers: [ReviewController]
})
export class ReviewModule {}

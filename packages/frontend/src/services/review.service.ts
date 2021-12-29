import { TeacherEntry, AddReview } from '@polyratings/shared';
import { config } from '@/App.config';
import { HttpService } from './http.service';

export class ReviewService {
  constructor(private httpService: HttpService) {}

  async uploadReview(newReview: AddReview): Promise<TeacherEntry> {
    const res = await this.httpService.fetch(`${config.remoteUrl}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newReview),
    });
    return res.json();
  }
}

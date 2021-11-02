import { Teacher } from "../models/Teacher";
import { config } from "../App.config";
import { HttpService } from "./http.service";
import { ReviewUpload } from "../models/Review";


export class ReviewService {
    constructor(
        private httpService:HttpService
    ){}

    async uploadReview(newReview:ReviewUpload): Promise<Teacher> {
        const res = await this.httpService.fetch(
            `${config.remoteUrl}/review`,
            {
                method:'POST',
                headers:{
                    'Content-Type':'application/json'
                },
                body:JSON.stringify(newReview)
            }
        )
        this.throwIfNot200(res)
        return res.json()
    }
   
    private throwIfNot200(res:Response) {
        if(res.status != 200 && res.status != 201) {
            throw res.statusText
        }
    }
}

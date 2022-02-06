import { Exclude } from "class-transformer";

export const ExcludeFrontend = () => Exclude({toPlainOnly:true})
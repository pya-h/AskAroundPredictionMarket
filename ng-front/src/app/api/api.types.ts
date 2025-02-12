import { Observable } from "rxjs";

export type ResponseFormat<T> = {
  status: string;
  message: string;
  data?: T;
  fields: any;
};

export type ResponseFormatObservable<T> = Observable<ResponseFormat<T>>;

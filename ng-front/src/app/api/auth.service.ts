import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseApiUrl: string = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseApiUrl}/auth/login`, {
      username,
      password,
    });
  }

  register(username: string, email: string, password: string): Observable<any> {
    const avatarId = 1;
    const verificationCode = '123456';
    const referralCode = '';
    return this.http.post<any>(`${this.baseApiUrl}/auth/register`, {
      username,
      email,
      password,
      avatarId,
      verificationCode,
      referralCode,
    });
  }
}

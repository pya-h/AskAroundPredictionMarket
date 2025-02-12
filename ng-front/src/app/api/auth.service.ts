import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api'; // Change to your backend URL

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, {
      username,
      password,
    });
  }

  register(username: string, email: string, password: string): Observable<any> {
    const avatarId = 1;
    const verificationCode = '12345';
    const referralCode = '';
    return this.http.post<any>(`${this.apiUrl}/auth/register`, {
      username,
      email,
      password,
      avatarId,
      verificationCode,
      referralCode,
    });
  }
}

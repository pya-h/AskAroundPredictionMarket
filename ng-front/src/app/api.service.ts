import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseApiUrl = 'http://localhost:8080/api'; // Change to your backend URL

  constructor(private http: HttpClient) {}

  get headers() {
    const token = localStorage.getItem('accessToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  get<T = any>(path: string, queryParams?: Record<string, any>): Observable<T> {
    return this.http.get<T>(
      `${this.baseApiUrl}/${path}${ApiService.joinQueryParams(queryParams)}`,
      { headers: this.headers }
    );
  }

  static joinQueryParams(params?: Record<string, any>): string {
    if (!params) return '';
    const paramNames = Object.keys(params);
    return paramNames?.length
      ? `?${paramNames.map((key) => `${key}=${params[key]}`).join('&')}`
      : '';
  }

  post<T = any>(
    path: string,
    body: Record<string, any>,
    queryParams?: Record<string, any>
  ): Observable<T> {
    return this.http.post<T>(
      `${this.baseApiUrl}/${path}${ApiService.joinQueryParams(queryParams)}`,
      body,
      { headers: this.headers }
    );
  }
}

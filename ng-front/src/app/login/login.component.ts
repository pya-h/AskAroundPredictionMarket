import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule],
})
export class LoginComponent {
  email: string = '';
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (this.password && (this.username || this.email)) {
      // Attempt to login
      this.authService
        .login(this.username || this.email, this.password)
        .subscribe(
          (response) => {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('userId', response.data.id);
            this.router.navigate(['/markets']);
          },
          (error) => {
            this.error = 'Login failed';
          }
        );
    } else {
      // Attempt to register
      this.authService
        .register(this.username, this.email, this.password)
        .subscribe(
          (response) => {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('userId', response.data.id);
            this.router.navigate(['/markets']);
          },
          (error) => {
            this.error = 'Registration failed';
          }
        );
    }
  }
}

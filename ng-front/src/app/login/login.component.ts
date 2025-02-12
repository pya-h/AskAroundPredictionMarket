import { Component } from '@angular/core';
import { AuthService } from '../api/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [FormsModule, CommonModule],
})
export class LoginComponent {
  email: string = '';
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  set err(msg: string) {
    this.error = msg;
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  onSubmit(): void {
    if (this.password && this.username && this.email) {
      this.authService
        .register(this.username, this.email, this.password)
        .subscribe(
          (response) => {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('userId', response.data.id);
            this.router.navigate(['/markets']);
          },
          (error) => {
            this.err = 'Registration failed: ' + error.message;
          }
        );
    } else {
      this.authService
        .login(this.username || this.email, this.password)
        .subscribe(
          (response) => {
            localStorage.setItem('accessToken', response.data.accessToken);
            localStorage.setItem('userId', response.data.id);
            this.router.navigate(['/markets']);
          },
          (error) => {
            this.err = 'Login failed: ' + error.message;
          }
        );
    }
  }
}

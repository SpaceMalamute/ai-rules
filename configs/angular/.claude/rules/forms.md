---
paths:
  - "**/*.component.ts"
  - "**/*.ts"
  - "**/*.html"
---

# Angular Signal-Based Forms

Use signals for reactive form state. These patterns leverage `signal()`, `computed()`, and `linkedSignal()` for form management.

## Basic Signal Form

```typescript
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="onSubmit()">
      <input
        type="email"
        [ngModel]="email()"
        (ngModelChange)="email.set($event)"
        placeholder="Email"
      />
      @if (emailError()) {
        <span class="error">{{ emailError() }}</span>
      }

      <input
        type="password"
        [ngModel]="password()"
        (ngModelChange)="password.set($event)"
        placeholder="Password"
      />
      @if (passwordError()) {
        <span class="error">{{ passwordError() }}</span>
      }

      <button type="submit" [disabled]="!isValid()">Login</button>
    </form>
  `,
})
export class LoginComponent {
  // Form state as signals
  protected readonly email = signal('');
  protected readonly password = signal('');

  // Computed validations
  protected readonly emailError = computed(() => {
    const value = this.email();
    if (!value) return 'Email is required';
    if (!value.includes('@')) return 'Invalid email format';
    return null;
  });

  protected readonly passwordError = computed(() => {
    const value = this.password();
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  });

  protected readonly isValid = computed(() => !this.emailError() && !this.passwordError());

  public onSubmit(): void {
    if (this.isValid()) {
      console.log({ email: this.email(), password: this.password() });
    }
  }
}
```

## Form with model() for Two-Way Binding

```typescript
import { Component, model, computed } from '@angular/core';

@Component({
  selector: 'app-user-form',
  template: `
    <input [(ngModel)]="name" placeholder="Name" />
    <input [(ngModel)]="email" placeholder="Email" />

    <p>Preview: {{ fullInfo() }}</p>
  `,
})
export class UserFormComponent {
  // Two-way bindable signals
  public readonly name = model('');
  public readonly email = model('');

  protected readonly fullInfo = computed(() => `${this.name()} <${this.email()}>`);
}

// Parent usage
// <app-user-form [(name)]="userName" [(email)]="userEmail" />
```

## Complex Form with Nested Objects

```typescript
interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface UserForm {
  name: string;
  email: string;
  address: Address;
}

@Component({
  selector: 'app-user-form',
  template: `
    <input [ngModel]="form().name" (ngModelChange)="updateField('name', $event)" />
    <input [ngModel]="form().email" (ngModelChange)="updateField('email', $event)" />

    <fieldset>
      <legend>Address</legend>
      <input
        [ngModel]="form().address.street"
        (ngModelChange)="updateAddress('street', $event)"
      />
      <input
        [ngModel]="form().address.city"
        (ngModelChange)="updateAddress('city', $event)"
      />
      <input
        [ngModel]="form().address.zipCode"
        (ngModelChange)="updateAddress('zipCode', $event)"
      />
    </fieldset>
  `,
})
export class UserFormComponent {
  protected readonly form = signal<UserForm>({
    name: '',
    email: '',
    address: { street: '', city: '', zipCode: '' },
  });

  protected updateField<K extends keyof UserForm>(field: K, value: UserForm[K]): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  protected updateAddress<K extends keyof Address>(field: K, value: string): void {
    this.form.update((f) => ({
      ...f,
      address: { ...f.address, [field]: value },
    }));
  }
}
```

## Form Array (Dynamic Fields)

```typescript
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-todo-form',
  template: `
    @for (item of items(); track item.id) {
      <div class="todo-item">
        <input
          type="checkbox"
          [checked]="item.completed"
          (change)="toggleComplete(item.id)"
        />
        <input
          [value]="item.text"
          (input)="updateText(item.id, $event)"
        />
        <button (click)="removeItem(item.id)">Remove</button>
      </div>
    }

    <button (click)="addItem()">Add Item</button>
  `,
})
export class TodoFormComponent {
  protected readonly items = signal<TodoItem[]>([]);

  protected addItem(): void {
    this.items.update((items) => [
      ...items,
      { id: crypto.randomUUID(), text: '', completed: false },
    ]);
  }

  protected removeItem(id: string): void {
    this.items.update((items) => items.filter((i) => i.id !== id));
  }

  protected updateText(id: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, text: value } : i))
    );
  }

  protected toggleComplete(id: string): void {
    this.items.update((items) =>
      items.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i))
    );
  }
}
```

## Async Validation

```typescript
@Component({
  selector: 'app-signup',
  template: `
    <input
      [ngModel]="username()"
      (ngModelChange)="onUsernameChange($event)"
    />
    @if (isCheckingUsername()) {
      <span>Checking...</span>
    }
    @if (usernameError()) {
      <span class="error">{{ usernameError() }}</span>
    }
    @if (usernameAvailable()) {
      <span class="success">Username available!</span>
    }
  `,
})
export class SignupComponent {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly username = signal('');
  protected readonly isCheckingUsername = signal(false);
  protected readonly usernameAvailable = signal<boolean | null>(null);

  protected readonly usernameError = computed(() => {
    const value = this.username();
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (this.usernameAvailable() === false) return 'Username is taken';
    return null;
  });

  protected onUsernameChange(value: string): void {
    this.username.set(value);
    this.usernameAvailable.set(null);

    if (value.length >= 3) {
      this.checkUsernameAvailability(value);
    }
  }

  private checkUsernameAvailability(username: string): void {
    this.isCheckingUsername.set(true);

    this.userService
      .checkUsername(username)
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (available) => {
          this.usernameAvailable.set(available);
          this.isCheckingUsername.set(false);
        },
        error: () => {
          this.isCheckingUsername.set(false);
        },
      });
  }
}
```

## Form Submission with Loading State

```typescript
@Component({
  selector: 'app-contact-form',
  template: `
    <form (ngSubmit)="onSubmit()">
      <input [ngModel]="name()" (ngModelChange)="name.set($event)" />
      <textarea [ngModel]="message()" (ngModelChange)="message.set($event)"></textarea>

      @if (submitError()) {
        <div class="error">{{ submitError() }}</div>
      }

      <button type="submit" [disabled]="isSubmitting() || !isValid()">
        @if (isSubmitting()) {
          Sending...
        } @else {
          Send Message
        }
      </button>
    </form>
  `,
})
export class ContactFormComponent {
  private readonly contactService = inject(ContactService);

  protected readonly name = signal('');
  protected readonly message = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly isValid = computed(() => this.name().length > 0 && this.message().length > 0);

  public async onSubmit(): Promise<void> {
    if (!this.isValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      await this.contactService.send({
        name: this.name(),
        message: this.message(),
      });

      // Reset form
      this.name.set('');
      this.message.set('');
    } catch (error) {
      this.submitError.set('Failed to send message. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
```

## Form Reset with linkedSignal

Use `linkedSignal` when form values should reset based on external state:

```typescript
@Component({
  selector: 'app-user-editor',
  template: `
    <input [ngModel]="email()" (ngModelChange)="email.set($event)" />
    <button (click)="save()">Save</button>
  `,
})
export class UserEditorComponent {
  // When selectedUser changes, email resets to user's email
  // But user can still edit it manually
  public readonly selectedUser = input.required<User>();

  protected readonly email = linkedSignal(() => this.selectedUser().email);

  protected save(): void {
    // email() contains the current (possibly edited) value
    console.log('Saving:', this.email());
  }
}
```

## When to Use Reactive Forms Instead

Use traditional `FormGroup`/`FormControl` when you need:
- Complex cross-field validation
- Dynamic form generation from schema
- Integration with third-party form libraries

```typescript
// For complex forms, ReactiveFormsModule is still valid
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// But prefer signal-based forms for new, simpler forms
```

## Anti-patterns

```typescript
// BAD: Using BehaviorSubject for form state
private readonly email$ = new BehaviorSubject('');

// GOOD: Use signals
protected readonly email = signal('');


// BAD: Manual subscription for validation
ngOnInit() {
  this.email$.subscribe(value => {
    this.emailError = this.validateEmail(value);
  });
}

// GOOD: Use computed
protected readonly emailError = computed(() => this.validateEmail(this.email()));


// BAD: Forgetting to handle loading state
public onSubmit(): void {
  this.service.save(this.form()).subscribe();  // No loading indicator!
}

// GOOD: Track submission state
protected readonly isSubmitting = signal(false);
public async onSubmit(): Promise<void> {
  this.isSubmitting.set(true);
  try {
    await firstValueFrom(this.service.save(this.form()));
  } finally {
    this.isSubmitting.set(false);
  }
}
```

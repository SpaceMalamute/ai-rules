---
description: "React form handling patterns"
paths:
  - "**/src/components/forms/**/*.tsx"
  - "**/src/**/form*.tsx"
  - "**/src/**/*-form.tsx"
---

# React Forms

## Native Form Actions (React 19)

### GOOD

```tsx
async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  await api.createUser({ name, email });
  redirect('/users');
}

function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create</button>
    </form>
  );
}
```

## useActionState for Form State

### GOOD

```tsx
interface FormState {
  errors?: { email?: string; password?: string };
  message?: string;
}

async function login(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email.includes('@')) {
    return { errors: { email: 'Invalid email' } };
  }

  try {
    await api.login({ email, password });
    return { message: 'Success' };
  } catch {
    return { errors: { password: 'Invalid credentials' } };
  }
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, {});

  return (
    <form action={formAction}>
      <div>
        <input name="email" type="email" aria-invalid={!!state.errors?.email} />
        {state.errors?.email && <span role="alert">{state.errors.email}</span>}
      </div>

      <div>
        <input name="password" type="password" aria-invalid={!!state.errors?.password} />
        {state.errors?.password && <span role="alert">{state.errors.password}</span>}
      </div>

      <button disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

## Controlled Inputs (When Needed)

### GOOD

```tsx
function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <input
      type="search"
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### BAD

```tsx
// Controlled when uncontrolled would work
function SimpleForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Just use form action with FormData instead
}
```

## React Hook Form (Complex Forms)

### GOOD

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    await api.login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} type="email" aria-invalid={!!errors.email} />
      {errors.email && <span role="alert">{errors.email.message}</span>}

      <input {...register('password')} type="password" aria-invalid={!!errors.password} />
      {errors.password && <span role="alert">{errors.password.message}</span>}

      <button disabled={isSubmitting}>Sign In</button>
    </form>
  );
}
```

## Form Accessibility

### GOOD

```tsx
<form>
  <div>
    <label htmlFor="email">Email Address</label>
    <input
      id="email"
      name="email"
      type="email"
      aria-describedby="email-error"
      aria-invalid={!!error}
      required
    />
    {error && <span id="email-error" role="alert">{error}</span>}
  </div>

  <button type="submit">Submit</button>
</form>
```

### BAD

```tsx
<form>
  <input placeholder="Email" /> {/* No label */}
  <span className="error">{error}</span> {/* No role, not linked */}
  <div onClick={submit}>Submit</div> {/* Not a button */}
</form>
```

## File Uploads

### GOOD

```tsx
async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { error: 'No file selected' };

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

function FileUpload() {
  const [state, action, isPending] = useActionState(uploadFile, null);

  return (
    <form action={action}>
      <input type="file" name="file" accept="image/*" />
      <button disabled={isPending}>Upload</button>
      {state?.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

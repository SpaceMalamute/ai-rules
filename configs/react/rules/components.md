---
description: "React component patterns and best practices"
paths:
  - "**/src/components/**/*.tsx"
  - "**/src/features/**/components/**/*.tsx"
---

# React Components

## Component Definition

### GOOD

```tsx
interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <article onClick={() => onSelect?.(user)}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </article>
  );
}
```

### BAD

```tsx
// Anonymous export
export default function({ user, onSelect }) {
  // ...
}

// Props not typed
function UserCard(props) {
  // ...
}
```

## Composition Over Props

### GOOD

```tsx
<Card>
  <Card.Header>
    <Title>Settings</Title>
  </Card.Header>
  <Card.Body>
    <SettingsForm />
  </Card.Body>
</Card>
```

### BAD

```tsx
<Card
  headerTitle="Settings"
  headerIcon={<SettingsIcon />}
  bodyContent={<SettingsForm />}
  footerActions={[...]}
/>
```

## Conditional Rendering

### GOOD

```tsx
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataList items={data} />}
```

### BAD

```tsx
{isLoading ? <Spinner /> : error ? <ErrorMessage /> : data ? <DataList /> : null}
```

## Event Handlers

### GOOD

```tsx
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  // ...
}

<form onSubmit={handleSubmit}>
```

### BAD

```tsx
<form onSubmit={(e) => {
  e.preventDefault();
  // Long inline logic...
}}>
```

## Refs (React 19)

### GOOD

```tsx
// React 19: ref is a regular prop
function Input({ ref, ...props }: InputProps & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

### BAD

```tsx
// Outdated: forwardRef no longer needed in React 19
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});
```

## Children Pattern

### GOOD

```tsx
interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function Layout({ children, sidebar }: LayoutProps) {
  return (
    <div className="layout">
      {sidebar && <aside>{sidebar}</aside>}
      <main>{children}</main>
    </div>
  );
}
```

## Render Props (When Needed)

### GOOD

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
}

export function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, i) => renderItem(item, i))}</ul>;
}

// Usage
<List items={users} renderItem={(user) => <UserCard user={user} />} />
```

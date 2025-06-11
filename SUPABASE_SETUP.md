# Supabase Setup Guide for VoiceNotion

This guide will help you set up Supabase for your VoiceNotion app, including authentication and database tables for notes.

## 1. Create a Supabase Account and Project

1. Go to [https://supabase.com/](https://supabase.com/) and sign up for an account or log in.
2. Create a new project by clicking "New Project".
3. Enter a name for your project (e.g., "VoiceNotion").
4. Set a secure database password (keep this safe, you'll need it for database access).
5. Choose the region closest to your users.
6. Click "Create new project" and wait for it to be provisioned.

## 2. Set Up Authentication

Supabase provides authentication out of the box. Here's how to configure it:

1. In your Supabase dashboard, navigate to "Authentication" in the left sidebar.
2. Under "Providers", enable "Email" as the authentication method.
3. Configure email templates for confirmation, invitation, and password reset emails.
4. (Optional) Set up additional authentication providers like Google, GitHub, etc. if desired.

## 3. Create Database Tables

The app requires two main tables: `notes` and `folders`. Run the following SQL in the SQL Editor in your Supabase dashboard:

```sql
-- Create notes table
create table public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  content jsonb not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  parent_id uuid references public.notes(id),
  is_deleted boolean default false,
  tags text[] default '{}',
  folder_id uuid references public.folders(id)
);

-- Create folders table
create table public.folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  parent_id uuid references public.folders(id),
  is_deleted boolean default false
);

-- Set RLS policies for notes
alter table public.notes enable row level security;

-- User can only see their own notes
create policy "Users can view their own notes" on public.notes
  for select using (auth.uid() = user_id);

-- User can only insert their own notes
create policy "Users can create their own notes" on public.notes
  for insert with check (auth.uid() = user_id);

-- User can only update their own notes
create policy "Users can update their own notes" on public.notes
  for update using (auth.uid() = user_id);

-- User can only delete their own notes
create policy "Users can delete their own notes" on public.notes
  for delete using (auth.uid() = user_id);

-- Set RLS policies for folders
alter table public.folders enable row level security;

-- User can only see their own folders
create policy "Users can view their own folders" on public.folders
  for select using (auth.uid() = user_id);
-- User can only insert their own folders
create policy "Users can create their own folders" on public.folders
  for insert with check (auth.uid() = user_id);

-- User can only update their own folders
create policy "Users can update their own folders" on public.folders
  for update using (auth.uid() = user_id);

-- User can only delete their own folders
create policy "Users can delete their own folders" on public.folders
  for delete using (auth.uid() = user_id);

-- Create updated_at trigger function
create or replace function update_modified_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for notes
create trigger update_notes_updated_at
  before update on public.notes
  for each row execute function update_modified_column();

-- Create trigger for folders
create trigger update_folders_updated_at
  before update on public.folders
  for each row execute function update_modified_column();
```

## 4. Get API Keys

You'll need the Supabase URL and anon key for your app:

1. Go to the "Settings" section in the sidebar.
2. Click "API" in the submenu.
3. Copy the "URL" and "anon public" key.

## 5. Configure Environment Variables

In your VoiceNotion app:

1. Create a `.env` file in the root of your project.
2. Add the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Replace `your-supabase-url` and `your-supabase-anon-key` with the values you copied in step 4.

## 6. Testing the Setup

To test if your Supabase setup is working correctly:

1. Start your app with `npm start` or `expo start`.
2. Try creating an account using the signup form.
3. After logging in, create a note and verify it's saved to the database.
4. Check in the Supabase dashboard under "Table Editor" to see if the notes are being stored correctly.

## 7. Troubleshooting

If you encounter issues:

- **Authentication Issues**: Check the authentication settings in the Supabase dashboard and ensure email confirmation is set up correctly.
- **Database Issues**: Verify that the SQL tables are created properly and that RLS policies are working.
- **Environment Variables**: Make sure the environment variables are correctly set in your app.
- **Sync Issues**: Check the console logs for any error messages related to Supabase operations.

## 8. Production Setup

For production deployment:

1. Configure a production Supabase project.
2. Update environment variables for production.
3. Consider adding additional security measures, such as email verification requirements.
4. Set up monitoring and alerts for critical operations.

## 9. Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [React Native AsyncStorage Documentation](https://reactnative.dev/docs/asyncstorage)

databse password = oDVpKVlHn1i2PUQa

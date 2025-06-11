// Note model structure with supabase integration

// Fields for Note model in Supabase
// id: uuid - primary key, auto-generated
// user_id: uuid - foreign key to auth.users table
// title: string - title of the note
// content: jsonb - content of the note (BlockNote JSON)
// created_at: timestamp - automatically set by Supabase
// updated_at: timestamp - automatically set by Supabase
// parent_id: uuid - reference to parent note for nesting, nullable
// is_deleted: boolean - soft delete flag
// tags: array - tags for the note
// folder_id: uuid - folder ID, nullable

/**
 * Create SQL for Supabase table:
 *
 * ```sql
 * create table public.notes (
 *   id uuid primary key default uuid_generate_v4(),
 *   user_id uuid references auth.users not null,
 *   title text not null,
 *   content jsonb not null default '{}',
 *   created_at timestamp with time zone default now(),
 *   updated_at timestamp with time zone default now(),
 *   parent_id uuid references public.notes(id),
 *   is_deleted boolean default false,
 *   tags text[] default '{}',
 *   folder_id uuid references public.folders(id)
 * );
 *
 * -- Set RLS policies
 * alter table public.notes enable row level security;
 *
 * -- User can only see their own notes
 * create policy "Users can view their own notes" on public.notes
 *   for select using (auth.uid() = user_id);
 *
 * -- User can only insert their own notes
 * create policy "Users can create their own notes" on public.notes
 *   for insert with check (auth.uid() = user_id);
 *
 * -- User can only update their own notes
 * create policy "Users can update their own notes" on public.notes
 *   for update using (auth.uid() = user_id);
 *
 * -- User can only delete their own notes
 * create policy "Users can delete their own notes" on public.notes
 *   for delete using (auth.uid() = user_id);
 *
 * -- Create updated_at trigger
 * create or replace function update_modified_column()
 * returns trigger as $$
 * begin
 *   new.updated_at = now();
 *   return new;
 * end;
 * $$ language plpgsql;
 *
 * create trigger update_notes_updated_at
 *   before update on public.notes
 *   for each row execute function update_modified_column();
 * ```
 *
 * Create SQL for folders table:
 *
 * ```sql
 * create table public.folders (
 *   id uuid primary key default uuid_generate_v4(),
 *   user_id uuid references auth.users not null,
 *   name text not null,
 *   created_at timestamp with time zone default now(),
 *   updated_at timestamp with time zone default now(),
 *   parent_id uuid references public.folders(id),
 *   is_deleted boolean default false
 * );
 *
 * -- Set RLS policies
 * alter table public.folders enable row level security;
 *
 * -- User can only see their own folders
 * create policy "Users can view their own folders" on public.folders
 *   for select using (auth.uid() = user_id);
 *
 * -- User can only insert their own folders
 * create policy "Users can create their own folders" on public.folders
 *   for insert with check (auth.uid() = user_id);
 *
 * -- User can only update their own folders
 * create policy "Users can update their own folders" on public.folders
 *   for update using (auth.uid() = user_id);
 *
 * -- User can only delete their own folders
 * create policy "Users can delete their own folders" on public.folders
 *   for delete using (auth.uid() = user_id);
 *
 * -- Create updated_at trigger
 * create trigger update_folders_updated_at
 *   before update on public.folders
 *   for each row execute function update_modified_column();
 * ```
 */

// Example of converting local note to Supabase note
export const localToSupabaseNote = (localNote, userId) => {
  // Parse contentJson if it exists, otherwise use content or empty object
  let contentToSave = {};

  if (localNote.contentJson) {
    try {
      // If contentJson is already a string, parse it to an object
      if (typeof localNote.contentJson === "string") {
        contentToSave = JSON.parse(localNote.contentJson);
      } else {
        // If it's already an object, use it directly
        contentToSave = localNote.contentJson;
      }
    } catch (err) {
      console.warn("Failed to parse contentJson:", err);
      // Fallback to content field or empty object
      contentToSave = localNote.content || {};
    }
  } else if (localNote.content) {
    contentToSave = localNote.content;
  }

  // Log the content being saved for debugging
  console.log(
    `Saving note ${localNote.id} to Supabase with content:`,
    typeof contentToSave === "object"
      ? "Object with keys: " + Object.keys(contentToSave).join(", ")
      : typeof contentToSave
  );

  return {
    id: localNote.id, // Keep the same ID for syncing
    user_id: userId,
    title: localNote.title || "Untitled",
    content: contentToSave,
    parent_id: localNote.parentId || null,
    tags: localNote.tags || [],
    folder_id: localNote.folderId || null,
    is_deleted: localNote.isDeleted || false,
  };
};

// Example of converting Supabase note to local note
export const supabaseToLocalNote = (supabaseNote) => {
  // Convert content to contentJson string
  let contentJson = "[]";

  if (supabaseNote.content) {
    try {
      if (typeof supabaseNote.content === "string") {
        // If it's already a string, validate it's proper JSON
        JSON.parse(supabaseNote.content);
        contentJson = supabaseNote.content;
      } else {
        // Otherwise stringify it
        contentJson = JSON.stringify(supabaseNote.content);
      }
    } catch (err) {
      console.warn("Error processing content from Supabase:", err);
      contentJson = "[]";
    }
  }

  return {
    id: supabaseNote.id,
    title: supabaseNote.title,
    contentJson: contentJson,
    content: supabaseNote.content || {}, // Keep for backward compatibility
    parentId: supabaseNote.parent_id,
    createdAt: supabaseNote.created_at,
    updatedAt: supabaseNote.updated_at,
    tags: supabaseNote.tags || [],
    folderId: supabaseNote.folder_id,
    isDeleted: supabaseNote.is_deleted,
  };
};

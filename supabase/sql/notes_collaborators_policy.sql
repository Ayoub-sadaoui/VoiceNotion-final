-- Enable RLS on notes table if not already enabled
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own notes
CREATE POLICY "Users can view their own notes"
    ON notes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy to allow collaborators to view shared notes
CREATE POLICY "Collaborators can view shared notes"
    ON notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM page_collaborators
            WHERE page_collaborators.page_id = notes.id
            AND page_collaborators.user_id = auth.uid()
        )
    );

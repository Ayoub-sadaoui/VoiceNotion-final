-- Enable RLS on page_collaborators
ALTER TABLE page_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own collaboration records
CREATE POLICY "Users can insert their own collaboration records"
    ON page_collaborators
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own collaboration records
CREATE POLICY "Users can view their own collaboration records"
    ON page_collaborators
    FOR SELECT
    USING (auth.uid() = user_id);

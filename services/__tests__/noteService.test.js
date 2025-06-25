import { supabase } from '../supabaseService';
import * as NoteService from '../noteService';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../supabaseService');
jest.mock('uuid');

describe('noteService', () => {
  const mockChainable = {
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    then: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnValue(mockChainable),
    update: jest.fn().mockReturnValue(mockChainable),
    insert: jest.fn().mockReturnValue(mockChainable),
    delete: jest.fn().mockReturnValue(mockChainable),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from.mockReturnValue(mockQueryBuilder);
    // Default resolution for chains that are awaited
    mockChainable.then.mockImplementation(resolve => resolve({ error: null, data: [] }));
  });

  describe('Data Conversion', () => {
    it('should convert supabase to local format', () => {
      const supabaseNote = { id: '1', title: 'Note', parent_id: 'p1', content: {} };
      const localNote = NoteService.supabaseToLocalNote(supabaseNote);
      expect(localNote.parentId).toBe('p1');
    });

    it('should convert local to supabase format', () => {
      const localNote = { id: '1', title: 'Note', parentId: 'p1', content: {} };
      const supabaseNote = NoteService.localToSupabaseNote(localNote, 'u1');
      expect(supabaseNote.parent_id).toBe('p1');
      expect(supabaseNote.user_id).toBe('u1');
    });
  });

  describe('CRUD operations', () => {
    it('should fetch notes', async () => {
      await NoteService.fetchNotesFromSupabase('u1');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    });

    it('should create a note', async () => {
      uuidv4.mockReturnValue('new-id');
      const { note } = await NoteService.createNote('u1', { title: 'New Note' });
      expect(note.id).toBe('new-id');
      expect(note.title).toBe('New Note');
    });

    it('should update a note', async () => {
      const existingNote = { id: '1', title: 'Old Title', content: {}, parent_id: null };
      mockChainable.single.mockResolvedValue({ data: existingNote, error: null });

      const { note, success } = await NoteService.updateNote('u1', '1', { title: 'New Title' });

      expect(success).toBe(true);
      expect(note.title).toBe('New Title');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Title' }));
    });

    it('should soft delete a note', async () => {
      const result = await NoteService.deleteNote('u1', '1');
      expect(result.success).toBe(true);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ is_deleted: true });
    });

    it('should hard delete a note', async () => {
      const result = await NoteService.deleteNote('u1', '1', true);
      expect(result.success).toBe(true);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });
  });

  describe('syncPendingNotesWithSupabase', () => {
    it('should return success', async () => {
      const result = await NoteService.syncPendingNotesWithSupabase('u1');
      expect(result.success).toBe(true);
    });
  });
});

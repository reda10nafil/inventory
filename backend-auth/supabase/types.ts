export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          google_id: string;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          google_id: string;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          google_id?: string;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      operators: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          role?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          operator_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          quantity: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operator_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          operator_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          quantity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_logs: {
        Row: {
          id: string;
          operator_id: string;
          action: string;
          data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operator_id: string;
          action: string;
          data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          operator_id?: string;
          action?: string;
          data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

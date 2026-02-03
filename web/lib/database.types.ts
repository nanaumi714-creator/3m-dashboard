export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      expense_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          default_category_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          default_category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          default_category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      payment_methods: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          occurred_on: string;
          description: string;
          amount_yen: number;
          vendor_raw: string | null;
          vendor_norm: string | null;
          payment_method_id: string;
          fingerprint: string | null;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          occurred_on: string;
          description: string;
          amount_yen: number;
          vendor_raw?: string | null;
          vendor_norm?: string | null;
          payment_method_id: string;
          fingerprint?: string | null;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          occurred_on?: string;
          description?: string;
          amount_yen?: number;
          vendor_raw?: string | null;
          vendor_norm?: string | null;
          payment_method_id?: string;
          fingerprint?: string | null;
          created_at?: string;
          user_id?: string | null;
        };
      };
      transaction_business_info: {
        Row: {
          transaction_id: string;
          is_business: boolean;
          business_ratio: number;
          category_id: string | null;
          audit_note: string | null;
          judged_at: string;
          judged_by: string;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          transaction_id: string;
          is_business: boolean;
          business_ratio: number;
          category_id?: string | null;
          audit_note?: string | null;
          judged_at: string;
          judged_by: string;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          transaction_id?: string;
          is_business?: boolean;
          business_ratio?: number;
          category_id?: string | null;
          audit_note?: string | null;
          judged_at?: string;
          judged_by?: string;
          created_at?: string;
          user_id?: string | null;
        };
      };
      receipts: {
        Row: {
          id: string;
          transaction_id: string;
          file_path: string;
          ocr_text: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          file_path: string;
          ocr_text?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          file_path?: string;
          ocr_text?: string | null;
          uploaded_at?: string;
        };
      };
      export_templates: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      export_history: {
        Row: {
          id: string;
          created_at: string;
          format: string;
          filters: Json;
          row_count: number;
          export_template_id: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          format: string;
          filters: Json;
          row_count: number;
          export_template_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          format?: string;
          filters?: Json;
          row_count?: number;
          export_template_id?: string | null;
          user_id?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      find_duplicate_transactions: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

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
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      export_history: {
        Row: {
          created_at: string;
          filters: Json | null;
          format: string;
          id: string;
          row_count: number;
          template_id: string | null;
        };
        Insert: {
          created_at?: string;
          filters?: Json | null;
          format: string;
          id?: string;
          row_count?: number;
          template_id?: string | null;
        };
        Update: {
          created_at?: string;
          filters?: Json | null;
          format?: string;
          id?: string;
          row_count?: number;
          template_id?: string | null;
        };
        Relationships: [];
      };
      export_templates: {
        Row: {
          columns: Json;
          created_at: string;
          filters: Json | null;
          format: string;
          id: string;
          name: string;
        };
        Insert: {
          columns: Json;
          created_at?: string;
          filters?: Json | null;
          format: string;
          id?: string;
          name: string;
        };
        Update: {
          columns?: Json;
          created_at?: string;
          filters?: Json | null;
          format?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      import_sources: {
        Row: {
          checksum: string | null;
          created_at: string;
          file_path: string | null;
          id: string;
          imported_at: string;
          metadata: Json | null;
          source_type: string;
        };
        Insert: {
          checksum?: string | null;
          created_at?: string;
          file_path?: string | null;
          id?: string;
          imported_at?: string;
          metadata?: Json | null;
          source_type: string;
        };
        Update: {
          checksum?: string | null;
          created_at?: string;
          file_path?: string | null;
          id?: string;
          imported_at?: string;
          metadata?: Json | null;
          source_type?: string;
        };
        Relationships: [];
      };
      ocr_usage_logs: {
        Row: {
          error_message: string | null;
          id: string;
          pages: number;
          provider: string;
          receipt_id: string | null;
          request_at: string;
          status: string;
        };
        Insert: {
          error_message?: string | null;
          id?: string;
          pages?: number;
          provider?: string;
          receipt_id?: string | null;
          request_at?: string;
          status: string;
        };
        Update: {
          error_message?: string | null;
          id?: string;
          pages?: number;
          provider?: string;
          receipt_id?: string | null;
          request_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      payment_methods: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          type?: string;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          content_type: string | null;
          file_size_bytes: number | null;
          id: string;
          ocr_confidence: number | null;
          ocr_text: string | null;
          original_filename: string | null;
          storage_url: string;
          transaction_id: string | null;
          uploaded_at: string;
          user_id: string | null;
        };
        Insert: {
          content_type?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          ocr_confidence?: number | null;
          ocr_text?: string | null;
          original_filename?: string | null;
          storage_url: string;
          transaction_id?: string | null;
          uploaded_at?: string;
          user_id?: string | null;
        };
        Update: {
          content_type?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          ocr_confidence?: number | null;
          ocr_text?: string | null;
          original_filename?: string | null;
          storage_url?: string;
          transaction_id?: string | null;
          uploaded_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          created_at: string;
          filters: Json | null;
          id: string;
          name: string;
          query: string | null;
        };
        Insert: {
          created_at?: string;
          filters?: Json | null;
          id?: string;
          name: string;
          query?: string | null;
        };
        Update: {
          created_at?: string;
          filters?: Json | null;
          id?: string;
          name?: string;
          query?: string | null;
        };
        Relationships: [];
      };
      transaction_business_info: {
        Row: {
          audit_note: string | null;
          business_ratio: number;
          category_id: string | null;
          is_business: boolean;
          judged_at: string;
          judged_by: string | null;
          transaction_id: string;
        };
        Insert: {
          audit_note?: string | null;
          business_ratio?: number;
          category_id?: string | null;
          is_business: boolean;
          judged_at?: string;
          judged_by?: string | null;
          transaction_id: string;
        };
        Update: {
          audit_note?: string | null;
          business_ratio?: number;
          category_id?: string | null;
          is_business?: boolean;
          judged_at?: string;
          judged_by?: string | null;
          transaction_id?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount_yen: number;
          created_at: string;
          description: string;
          duplicate_group_id: string | null;
          fingerprint: string;
          id: string;
          import_source_id: string | null;
          occurred_on: string;
          payment_method_id: string;
          source_row_number: number | null;
          updated_at: string;
          vendor_norm: string | null;
          vendor_raw: string | null;
        };
        Insert: {
          amount_yen: number;
          created_at?: string;
          description: string;
          duplicate_group_id?: string | null;
          fingerprint: string;
          id?: string;
          import_source_id?: string | null;
          occurred_on: string;
          payment_method_id: string;
          source_row_number?: number | null;
          updated_at?: string;
          vendor_norm?: string | null;
          vendor_raw?: string | null;
        };
        Update: {
          amount_yen?: number;
          created_at?: string;
          description?: string;
          duplicate_group_id?: string | null;
          fingerprint?: string;
          id?: string;
          import_source_id?: string | null;
          occurred_on?: string;
          payment_method_id?: string;
          source_row_number?: number | null;
          updated_at?: string;
          vendor_norm?: string | null;
          vendor_raw?: string | null;
        };
        Relationships: [];
      };
      vendor_aliases: {
        Row: {
          alias: string;
          confidence_score: number | null;
          created_at: string;
          id: string;
          vendor_id: string;
        };
        Insert: {
          alias: string;
          confidence_score?: number | null;
          created_at?: string;
          id?: string;
          vendor_id: string;
        };
        Update: {
          alias?: string;
          confidence_score?: number | null;
          created_at?: string;
          id?: string;
          vendor_id?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          created_at: string;
          default_category_id: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_category_id?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_category_id?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

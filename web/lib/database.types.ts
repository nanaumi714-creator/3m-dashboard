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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          occurred_on: string;
          description: string;
          amount_yen: number;
          vendor_raw: string | null;
          vendor_norm: string | null;
          vendor_id: string | null;
          payment_method_id: string;
          import_source_id: string | null;
          source_row_number: number | null;
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
          vendor_id?: string | null;
          payment_method_id: string;
          import_source_id?: string | null;
          source_row_number?: number | null;
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
          vendor_id?: string | null;
          payment_method_id?: string;
          import_source_id?: string | null;
          source_row_number?: number | null;
          fingerprint?: string | null;
          created_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
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
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          transaction_id: string | null;
          storage_url: string;
          original_filename: string | null;
          content_type: string | null;
          file_size_bytes: number | null;
          user_id: string | null;
          ocr_text: string | null;
          ocr_confidence: number | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          transaction_id?: string | null;
          storage_url: string;
          original_filename?: string | null;
          content_type?: string | null;
          file_size_bytes?: number | null;
          user_id?: string | null;
          ocr_text?: string | null;
          ocr_confidence?: number | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string | null;
          storage_url?: string;
          original_filename?: string | null;
          content_type?: string | null;
          file_size_bytes?: number | null;
          user_id?: string | null;
          ocr_text?: string | null;
          ocr_confidence?: number | null;
          uploaded_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      user_category_preferences: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendor_aliases: {
        Row: {
          id: string;
          vendor_id: string;
          alias: string;
          is_active: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          alias: string;
          is_active?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          alias?: string;
          is_active?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vendor_rules: {
        Row: {
          id: string;
          vendor_id: string;
          is_active: boolean;
          rule_priority: number;
          is_business: boolean;
          business_ratio: number;
          category_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          is_active?: boolean;
          rule_priority?: number;
          is_business: boolean;
          business_ratio: number;
          category_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          is_active?: boolean;
          rule_priority?: number;
          is_business?: boolean;
          business_ratio?: number;
          category_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      import_sources: {
        Row: {
          id: string;
          source_type: string;
          file_path: string | null;
          checksum: string | null;
          metadata: Json | null;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          source_type: string;
          file_path?: string | null;
          checksum?: string | null;
          metadata?: Json | null;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          source_type?: string;
          file_path?: string | null;
          checksum?: string | null;
          metadata?: Json | null;
          created_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      ocr_usage_logs: {
        Row: {
          id: string;
          receipt_id: string | null;
          status: string;
          pages: number | null;
          provider: string | null;
          error_message: string | null;
          request_at: string;
        };
        Insert: {
          id?: string;
          receipt_id?: string | null;
          status: string;
          pages?: number | null;
          provider?: string | null;
          error_message?: string | null;
          request_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string | null;
          status?: string;
          pages?: number | null;
          provider?: string | null;
          error_message?: string | null;
          request_at?: string;
        };
        Relationships: [];
      };
      ocr_requests: {
        Row: {
          id: string;
          receipt_id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          user_id: string;
          status: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          user_id?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      ocr_feedback: {
        Row: {
          id: string;
          receipt_id: string;
          ocr_request_id: string;
          feedback_type: string;
          details: string | null;
          corrected_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receipt_id: string;
          ocr_request_id: string;
          feedback_type: string;
          details?: string | null;
          corrected_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receipt_id?: string;
          ocr_request_id?: string;
          feedback_type?: string;
          details?: string | null;
          corrected_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      gmail_sync_logs: {
        Row: {
          id: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          emails_processed: number | null;
          receipts_saved: number | null;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          status: string;
          started_at?: string;
          completed_at?: string | null;
          emails_processed?: number | null;
          receipts_saved?: number | null;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          emails_processed?: number | null;
          receipts_saved?: number | null;
          error_message?: string | null;
        };
        Relationships: [];
      };
      backups: {
        Row: {
          id: string;
          backup_type: string;
          status: string;
          backup_timestamp: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          backup_type: string;
          status: string;
          backup_timestamp: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          backup_type?: string;
          status?: string;
          backup_timestamp?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
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
